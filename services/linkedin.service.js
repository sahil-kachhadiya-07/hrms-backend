const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver');
const authService = require('./auth.service');

// Helper function to handle LinkedIn verification challenges
const handleVerificationChallenge = async (driver) => {
  console.log('Attempting to handle LinkedIn verification challenge...');
  
  try {
    // Wait a bit longer for the challenge page to load
    await driver.sleep(3000);
    
    // Look for verification code input field
    const verificationSelectors = [
      'input[name="pin"]',
      'input[name="challengeId"]',
      'input[name="verification"]',
      'input[type="text"][placeholder*="code"]',
      'input[type="text"][placeholder*="verify"]',
      '.challenge-form input[type="text"]'
    ];
    
    let verificationInput = null;
    for (const selector of verificationSelectors) {
      try {
        verificationInput = await driver.findElement(By.css(selector));
        console.log(`Found verification input with selector: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (verificationInput) {
      console.log('LinkedIn verification code required. Browser will remain open for manual verification...');
      console.log('Please complete the verification in the browser window and the process will continue automatically.');
      
      // Wait for the user to complete verification (check URL changes)
      let attempts = 0;
      const maxAttempts = 60; // Wait up to 5 minutes (60 * 5 seconds)
      
      while (attempts < maxAttempts) {
        await driver.sleep(5000); // Wait 5 seconds between checks
        const currentUrl = await driver.getCurrentUrl();
        
        if (!currentUrl.includes('challenge') && !currentUrl.includes('login')) {
          console.log('Verification completed successfully!');
          return true; // Verification completed
        }
        
        attempts++;
        console.log(`Waiting for manual verification... (${attempts}/${maxAttempts})`);
      }
      
      throw new Error('Verification timeout. Please complete LinkedIn verification faster and try again.');
    }
    
    // Look for skip or continue buttons
    const skipSelectors = [
      'button[data-control-name="skip"]',
      'button[data-control-name="continue"]',
      'a[data-control-name="skip"]',
      '.skip-link',
      'button:contains("Skip")',
      'button:contains("Continue")'
    ];
    
    for (const selector of skipSelectors) {
      try {
        const skipButton = await driver.findElement(By.css(selector));
        console.log(`Found skip button with selector: ${selector}`);
        await skipButton.click();
        await driver.sleep(2000);
        return true; // Successfully skipped
      } catch (e) {
        continue;
      }
    }
    
    return false; // Could not handle the challenge
  } catch (error) {
    console.error('Error handling verification challenge:', error.message);
    throw error;
  }
};

const linkedinService = {
  // Post a job to LinkedIn
  postJob: async (userId, jobData) => {
    let driver = null;
    
    try {
      // Get user's LinkedIn credentials
      const credentials = await authService.getLinkedInCredentialsForService(userId);
      
      if (!credentials || !credentials.isConnected) {
        throw new Error('LinkedIn credentials not found or not connected');
      }

      // Configure Chrome options
      const options = new chrome.Options();
      options.addArguments('--disable-blink-features=AutomationControlled');
      options.addArguments('--disable-web-security');
      options.addArguments('--allow-running-insecure-content');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-extensions');
      options.addArguments('--disable-infobars');
      options.addArguments('--disable-notifications');
      options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Add preferences to reduce detection
      options.setUserPreferences({
        'profile.default_content_setting_values.notifications': 2,
        'profile.default_content_settings.popups': 0,
        'profile.managed_default_content_settings.images': 2
      });
      
      // Set to headless for production, visible for debugging and verification
      // options.addArguments('--headless'); // Keep commented for manual verification when needed
      
      // Build WebDriver
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      // Set window size
      await driver.manage().window().setRect({ width: 1366, height: 768 });
      
      console.log('Navigating to LinkedIn login...');
      // Navigate to LinkedIn login
      await driver.get('https://www.linkedin.com/login');
      await driver.sleep(2000);

      // Wait for and fill username
      console.log('Entering credentials...');
      const usernameField = await driver.wait(until.elementLocated(By.id('username')), 10000);
      await usernameField.clear();
      await usernameField.sendKeys(credentials.email);

      // Fill password
      const passwordField = await driver.findElement(By.id('password'));
      await passwordField.clear();
      await passwordField.sendKeys(jobData.linkedinPassword); // Use the raw password passed from frontend

      // Click login button
      const loginButton = await driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();

      // Wait for navigation and check if login was successful
      await driver.sleep(5000);
      const currentUrl = await driver.getCurrentUrl();
      
      // Handle verification challenge
      if (currentUrl.includes('challenge')) {
        console.log('LinkedIn verification challenge detected...');
        
        try {
          const challengeHandled = await handleVerificationChallenge(driver);
          if (!challengeHandled) {
            throw new Error('Could not automatically handle LinkedIn verification challenge.');
          }
          
          // Wait and check URL again after handling challenge
          await driver.sleep(3000);
          const newUrl = await driver.getCurrentUrl();
          if (newUrl.includes('challenge') || newUrl.includes('login')) {
            throw new Error('LinkedIn verification still required after challenge handling.');
          }
        } catch (error) {
          // If it's a timeout or verification error, provide helpful message
          if (error.message.includes('timeout') || error.message.includes('verification')) {
            throw new Error('LinkedIn verification required. The browser window will open for manual verification. Please complete the verification process in the browser and try again.');
          }
          throw new Error(`LinkedIn verification required: ${error.message}`);
        }
      }
      
      if (currentUrl.includes('login')) {
        throw new Error('LinkedIn login failed. Please check your credentials.');
      }

      console.log('Login successful, navigating directly to post creation modal...');
      
      // Get user's profile URL first
      let profileUrl = 'https://www.linkedin.com/in/me/';
      try {
        // Try to get the actual profile URL from the user's credentials or navigate to profile
        await driver.get('https://www.linkedin.com/in/me/');
        await driver.sleep(2000);
        currentUrl = await driver.getCurrentUrl();
        
        // Extract the profile URL from the current URL
        if (currentUrl.includes('/in/')) {
          const profileMatch = currentUrl.match(/https:\/\/www\.linkedin\.com\/in\/[^\/]+/);
          if (profileMatch) {
            profileUrl = profileMatch[0];
            console.log('Found profile URL:', profileUrl);
          }
        }
      } catch (profileError) {
        console.log('Could not determine profile URL, using default:', profileError.message);
      }
      
      // Navigate directly to the post creation modal
      const postModalUrl = `${profileUrl}/overlay/create-post/`;
      console.log('Navigating to post modal URL:', postModalUrl);
      
      try {
        await driver.get(postModalUrl);
        await driver.sleep(3000);
        console.log('Successfully opened post creation modal');
      } catch (modalError) {
        console.log('Direct modal URL failed, falling back to button click method:', modalError.message);
        
        // Fallback to the original button clicking method
        await driver.get('https://www.linkedin.com/in/me/');
        await driver.sleep(3000);
        
        // Look for the "Create a post" button
        const postButtonSelectors = [
          '#navigation-create-post-Create-a-post',
          'button#navigation-create-post-Create-a-post',
          '[id="navigation-create-post-Create-a-post"]',
          'button[aria-label*="Create a post"]',
          'button[aria-label*="create a post"]',
          'button:contains("Create a post")',
          'button:contains("create a post")',
          'button[aria-label*="Start a post"]',
          '.share-box-feed-entry__trigger',
          'button.share-box-feed-entry__trigger',
          '[data-control-name="share_via_feed_composer"]'
        ];
        
        let startPostButton = null;
        for (const selector of postButtonSelectors) {
          try {
            console.log(`Trying fallback selector: ${selector}`);
            startPostButton = await driver.wait(until.elementLocated(By.css(selector)), 5000);
            console.log(`Found post button with fallback selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Fallback selector ${selector} not found, trying next...`);
            continue;
          }
        }
        
        if (startPostButton) {
          console.log('Clicking post button as fallback...');
          await driver.executeScript("arguments[0].scrollIntoView(true);", startPostButton);
          await driver.sleep(1000);
          await startPostButton.click();
          await driver.sleep(3000);
        } else {
          throw new Error('Could not find post button even with fallback method');
        }
      }

      // Post modal should now be open, verify it's loaded
      console.log('Verifying post modal is open...');
      currentUrl = await driver.getCurrentUrl();
      console.log('Current URL after modal open:', currentUrl);
      
      // Check if we're on the post creation modal
      if (!currentUrl.includes('create-post') && !currentUrl.includes('overlay')) {
        console.log('Post modal may not have opened properly, checking for text area...');
      }

      // Wait for the post composer to open and find text area
      console.log('Waiting for post composer to open...');
      let textArea = null;
      
      const textAreaSelectors = [
        // Post modal specific selectors
        '.ql-editor[contenteditable="true"]',
        'div[contenteditable="true"]',
        '[data-placeholder*="What do you want to talk about"]',
        '[data-placeholder*="Start a conversation"]',
        '[data-placeholder*="Share an article, photo, video or idea"]',
        '.mentions-texteditor__content',
        'div[role="textbox"]',
        '.share-creation-state__text-editor',
        '[data-test-id="share-box-text-editor"]',
        '.editor-content[contenteditable="true"]',
        '.ql-editor',
        '.ql-container .ql-editor',
        '.share-box__text-editor',
        '.share-creation-state__text-editor .ql-editor',
        'div[contenteditable="true"][role="textbox"]',
        '.ql-editor[contenteditable="true"][role="textbox"]'
      ];

      // Wait for composer modal to appear
      await driver.sleep(2000);

      for (const selector of textAreaSelectors) {
        try {
          console.log(`Trying text area selector: ${selector}`);
          textArea = await driver.wait(until.elementLocated(By.css(selector)), 10000);
          console.log(`Found text area with selector: ${selector}`);
          
          // Check if element is actually visible and interactable
          const isDisplayed = await textArea.isDisplayed();
          const isEnabled = await textArea.isEnabled();
          console.log(`Text area - displayed: ${isDisplayed}, enabled: ${isEnabled}`);
          
          if (isDisplayed && isEnabled) {
            break;
          } else {
            textArea = null;
            continue;
          }
        } catch (e) {
          console.log(`Text area selector ${selector} not found, trying next...`);
          continue;
        }
      }

      if (!textArea) {
        console.log('Could not find text area. Checking page source for debugging...');
        try {
          const pageSource = await driver.getPageSource();
          const hasModal = pageSource.includes('share-creation-state') || pageSource.includes('compose-modal');
          console.log('Post composer modal found:', hasModal);
          
          // Try to find any contenteditable elements
          const editableElements = await driver.findElements(By.css('[contenteditable="true"]'));
          console.log(`Found ${editableElements.length} contenteditable elements`);
          
          if (editableElements.length > 0) {
            textArea = editableElements[0];
            console.log('Using first contenteditable element as text area');
          }
        } catch (debugError) {
          console.log('Debug error:', debugError.message);
        }
      }

      if (!textArea) {
        throw new Error('Could not find post text area. LinkedIn composer may not have opened properly.');
      }

      // Create the job post content
      const postText = `🚀 We're Hiring! ${jobData.title}

${jobData.content}

#hiring #jobs #career #opportunity`;

      console.log('Setting post content...');
      console.log('Post content to be typed:', postText);
      
      // Click on text area to focus
      await driver.executeScript("arguments[0].scrollIntoView(true);", textArea);
      await driver.sleep(500);
      await textArea.click();
      await driver.sleep(1000);
      
      // Clear any existing content
      await driver.executeScript("arguments[0].innerHTML = '';", textArea);
      await driver.sleep(500);
      
      // Try multiple methods to enter text
      let contentSet = false;
      
      try {
        // Method 1: Direct sendKeys
        await textArea.sendKeys(postText);
        console.log('Content typed using sendKeys');
        contentSet = true;
      } catch (sendKeysError) {
        console.log('SendKeys failed, trying JavaScript method...');
        
        try {
          // Method 2: JavaScript innerHTML
          await driver.executeScript("arguments[0].innerHTML = arguments[1];", textArea, postText);
          console.log('Content set using innerHTML');
          contentSet = true;
        } catch (innerHTMLError) {
          console.log('innerHTML failed, trying textContent...');
          
          try {
            // Method 3: JavaScript textContent
            await driver.executeScript("arguments[0].textContent = arguments[1];", textArea, postText);
            console.log('Content set using textContent');
            contentSet = true;
          } catch (textContentError) {
            console.log('textContent failed, trying innerText...');
            
            // Method 4: JavaScript innerText
            await driver.executeScript("arguments[0].innerText = arguments[1];", textArea, postText);
            console.log('Content set using innerText');
            contentSet = true;
          }
        }
      }
      
      if (!contentSet) {
        throw new Error('All methods failed to set content');
      }
      
      // Trigger input events to make LinkedIn recognize the content
      await driver.executeScript(`
        const element = arguments[0];
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        element.dispatchEvent(new Event('focus', { bubbles: true }));
      `, textArea);
      
      await driver.sleep(2000);
      
      // Verify content was entered
      const enteredText = await driver.executeScript("return arguments[0].textContent || arguments[0].innerText || arguments[0].innerHTML;", textArea);
      console.log('Content verification - entered text length:', enteredText.length);
      console.log('Content verification - first 100 chars:', enteredText.substring(0, 100));
      
      if (enteredText.length === 0) {
        throw new Error('Failed to enter content into text area');
      }
      
      console.log('Content successfully set in text area');

      // Find and click the Post button
      console.log('Looking for post button...');
      let postButton = null;
      
      const publishButtonSelectors = [
        // Primary post button selectors
        'button[data-control-name="share.post"]',
        'button[aria-label*="Post"]',
        'button[aria-label*="post"]',
        'button[data-test-id="share-post-button"]',
        'button[data-test-id="post-button"]',
        
        // Text-based selectors
        'button:contains("Post")',
        'button:contains("post")',
        'button:contains("Share")',
        'button:contains("share")',
        'button:contains("Publish")',
        'button:contains("publish")',
        
        // Class-based selectors
        '.share-actions__primary-action',
        'button.share-actions__primary-action',
        '.artdeco-button--primary[type="submit"]',
        'button[type="submit"]',
        '.artdeco-button--primary',
        '.share-actions button',
        '.share-creation-state button',
        
        // Generic selectors
        'button[type="submit"]',
        'button.artdeco-button--primary',
        '.artdeco-button--primary',
        'button[data-control-name*="post"]',
        'button[data-control-name*="share"]'
      ];

      // Wait a bit for the post button to become available
      await driver.sleep(1000);

      for (const selector of publishButtonSelectors) {
        try {
          console.log(`Trying post button selector: ${selector}`);
          const buttons = await driver.findElements(By.css(selector));
          console.log(`Found ${buttons.length} buttons with selector: ${selector}`);
          
          for (const button of buttons) {
            try {
              const text = await button.getText();
              const isDisplayed = await button.isDisplayed();
              const isEnabled = await button.isEnabled();
              
              console.log(`Button text: "${text}", displayed: ${isDisplayed}, enabled: ${isEnabled}`);
              
              if (isDisplayed && isEnabled && (text.toLowerCase().includes('post') || text.toLowerCase().includes('share') || text.toLowerCase().includes('publish'))) {
                postButton = button;
                console.log(`Selected post button with text: "${text}"`);
                break;
              }
            } catch (buttonError) {
              console.log('Error checking button:', buttonError.message);
              continue;
            }
          }
          if (postButton) break;
        } catch (e) {
          console.log(`Publish button selector ${selector} not found, trying next...`);
          continue;
        }
      }

      // If no specific post button found, try to find any primary button
      if (!postButton) {
        console.log('No specific post button found, looking for any primary button...');
        try {
          const primaryButtons = await driver.findElements(By.css('.artdeco-button--primary, button[type="submit"]'));
          console.log(`Found ${primaryButtons.length} primary buttons`);
          
          for (const button of primaryButtons) {
            try {
              const text = await button.getText();
              const isDisplayed = await button.isDisplayed();
              const isEnabled = await button.isEnabled();
              
              console.log(`Primary button text: "${text}", displayed: ${isDisplayed}, enabled: ${isEnabled}`);
              
              if (isDisplayed && isEnabled) {
                postButton = button;
                console.log(`Using primary button with text: "${text}"`);
                break;
              }
            } catch (buttonError) {
              continue;
            }
          }
        } catch (e) {
          console.log('Could not find primary button either');
        }
      }

      if (!postButton) {
        console.log('Taking screenshot for debugging post button issue...');
        try {
          const screenshot = await driver.takeScreenshot();
          console.log('Screenshot taken for post button debugging');
          
          // Also log all buttons on the page for debugging
          const allButtons = await driver.findElements(By.css('button'));
          console.log(`Total buttons found on page: ${allButtons.length}`);
          
          for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            try {
              const button = allButtons[i];
              const text = await button.getText();
              const className = await button.getAttribute('class');
              const isDisplayed = await button.isDisplayed();
              console.log(`Button ${i + 1}: text="${text}", class="${className}", displayed=${isDisplayed}`);
            } catch (e) {
              continue;
            }
          }
        } catch (screenshotError) {
          console.log('Could not take screenshot:', screenshotError.message);
        }
        throw new Error('Could not find post button. The post composer may not have loaded properly.');
      }

      console.log('Auto-clicking post button...');
      let buttonClicked = false;
      
      try {
        // Method 1: Scroll to button and click
        await driver.executeScript("arguments[0].scrollIntoView(true);", postButton);
        await driver.sleep(500);
        await postButton.click();
        console.log('Post button clicked successfully using direct click');
        buttonClicked = true;
      } catch (clickError) {
        console.log('Direct click failed, trying JavaScript click...');
        
        try {
          // Method 2: JavaScript click
          await driver.executeScript("arguments[0].click();", postButton);
          console.log('Post button clicked using JavaScript');
          buttonClicked = true;
        } catch (jsClickError) {
          console.log('JavaScript click failed, trying dispatchEvent...');
          
          try {
            // Method 3: Dispatch click event
            await driver.executeScript(`
              const button = arguments[0];
              button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            `, postButton);
            console.log('Post button clicked using dispatchEvent');
            buttonClicked = true;
          } catch (eventError) {
            console.log('All click methods failed:', eventError.message);
          }
        }
      }
      
      if (!buttonClicked) {
        throw new Error('Failed to click post button with all available methods');
      }
      
      // Wait for post to be published
      console.log('Waiting for post to be published...');
      await driver.sleep(5000);

      // Check for success indicators
      console.log('Checking for post success indicators...');
      const successIndicators = [
        '.artdeco-toast-message',
        '.feed-shared-update-v2__description',
        '[data-test-id="post-success"]',
        '.feed-shared-update-v2',
        '.share-update-card'
      ];

      let postSuccess = false;
      let successMessage = '';
      
      for (const selector of successIndicators) {
        try {
          const element = await driver.wait(until.elementLocated(By.css(selector)), 5000);
          if (element) {
            postSuccess = true;
            console.log(`Success indicator found: ${selector}`);
            try {
              successMessage = await element.getText();
            } catch (textError) {
              successMessage = 'Post published successfully';
            }
            break;
          }
        } catch (e) {
          console.log(`Success indicator ${selector} not found`);
          continue;
        }
      }

      // Alternative success check: verify we're back on the feed and the composer is closed
      if (!postSuccess) {
        console.log('No success indicators found, checking page state...');
        try {
          const currentUrl = await driver.getCurrentUrl();
          const pageSource = await driver.getPageSource();
          
          // Check if we're on the feed and composer is closed
          if (currentUrl.includes('/feed/') && !pageSource.includes('share-creation-state')) {
            postSuccess = true;
            successMessage = 'Post appears to have been published (composer closed)';
            console.log('Success determined by page state');
          }
        } catch (stateCheckError) {
          console.log('Error checking page state:', stateCheckError.message);
        }
      }

      // Final verification: look for our posted content on the feed
      if (!postSuccess) {
        console.log('Checking feed for posted content...');
        try {
          await driver.sleep(2000);
          const pageSource = await driver.getPageSource();
          const jobTitle = jobData.title;
          
          if (pageSource.includes(jobTitle) || pageSource.includes('We\'re Hiring!')) {
            postSuccess = true;
            successMessage = 'Post content found on feed';
            console.log('Success verified by finding content on feed');
          }
        } catch (contentCheckError) {
          console.log('Error checking feed content:', contentCheckError.message);
        }
      }

      if (postSuccess) {
        console.log('Post completed successfully!');
                 return {
           success: true,
           message: `Job posted to LinkedIn successfully. ${successMessage}`,
                       platform: 'linkedin',
           postedAt: new Date()
         };
      } else {
        console.log('Could not verify post success, but no errors occurred');
                 return {
           success: true,
           message: 'Job posting completed. Please check your LinkedIn feed to verify.',
                       platform: 'linkedin',
           postedAt: new Date()
         };
      }

    } catch (error) {
      console.error('LinkedIn posting error:', error.message);
      
      // Handle specific error cases
      if (error.message.includes('credentials')) {
        throw new Error('LinkedIn credentials are invalid or missing');
      } else if (error.message.includes('login failed')) {
        throw new Error('Failed to login to LinkedIn. Please verify your credentials.');
      } else if (error.message.includes('Could not find')) {
        throw new Error('LinkedIn page structure has changed. Please contact support.');
      } else if (error.message.includes('WebDriverError') || error.message.includes('ChromeDriver')) {
        throw new Error('Browser automation failed. Please try again or contact support.');
      } else if (error.message.includes('timeout') || error.message.includes('Wait timed out')) {
        throw new Error('LinkedIn page took too long to load. Please check your internet connection and try again.');
      } else if (error.message.includes('no such element')) {
        throw new Error('LinkedIn page layout has changed. Please contact support for an update.');
      } else {
        throw new Error(`Failed to post to LinkedIn: ${error.message}`);
      }
    } finally {
      // Always close the browser
      if (driver) {
        try {
          await driver.quit();
        } catch (e) {
          console.error('Error closing driver:', e.message);
        }
      }
    }
  },

  // Test LinkedIn credentials
  testCredentials: async (userId, linkedinPassword) => {
    let driver = null;
    
    try {
      const credentials = await authService.getLinkedInCredentialsForService(userId);
      
      if (!credentials || !credentials.isConnected) {
        throw new Error('LinkedIn credentials not found');
      }

      // Configure Chrome options for testing
      const options = new chrome.Options();
      options.addArguments('--headless'); // Always headless for testing
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-extensions');
      options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      await driver.get('https://www.linkedin.com/login');
      await driver.sleep(2000);

      const usernameField = await driver.wait(until.elementLocated(By.id('username')), 10000);
      await usernameField.sendKeys(credentials.email);

      const passwordField = await driver.findElement(By.id('password'));
      await passwordField.sendKeys(linkedinPassword);

      const loginButton = await driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();

      await driver.sleep(5000);
      const currentUrl = await driver.getCurrentUrl();
      const isLoginSuccessful = !currentUrl.includes('login') && !currentUrl.includes('challenge');

      return {
        success: isLoginSuccessful,
        message: isLoginSuccessful 
          ? 'LinkedIn credentials verified successfully' 
          : 'LinkedIn credentials verification failed'
      };

    } catch (error) {
      console.error('LinkedIn credential test error:', error.message);
      return {
        success: false,
        message: 'Failed to verify LinkedIn credentials'
      };
    } finally {
      if (driver) {
        try {
          await driver.quit();
        } catch (e) {
          console.error('Error closing driver:', e.message);
        }
      }
    }
  },

  // Get LinkedIn posting guidelines
  getPostingGuidelines: () => {
    return {
      maxLength: 3000,
      supportedFormats: ['text', 'image', 'video', 'document'],
      bestPractices: [
        'Use relevant hashtags',
        'Include engaging content',
        'Add call-to-action',
        'Keep it professional',
        'Use proper formatting'
      ],
      restrictions: [
        'No spam content',
        'Follow community guidelines',
        'Respect intellectual property',
        'No misleading information'
      ]
    };
  },

  // Get verification help information
  getVerificationHelp: () => {
    return {
      title: 'LinkedIn Verification Required',
      message: 'LinkedIn has detected automated activity and requires verification.',
      steps: [
        '1. A Chrome browser window will open automatically',
        '2. Complete the verification challenge (enter code, solve CAPTCHA, etc.)',
        '3. The system will automatically continue once verification is complete',
        '4. Do not close the browser window during this process'
      ],
      tips: [
        'Keep the browser window visible and active',
        'Complete verification within 5 minutes',
        'If verification fails, try logging into LinkedIn manually first',
        'Consider using LinkedIn less frequently to avoid future challenges'
      ],
      troubleshooting: [
        'If browser doesn\'t open, check if Chrome is installed',
        'If verification times out, try the posting process again',
        'For persistent issues, login to LinkedIn manually first'
      ]
    };
  }
};

module.exports = linkedinService;
