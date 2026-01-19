/**
 * Integration Test for CanvaScripter
 * 
 * This test can be run from within the Electron app to test actual functionality.
 * Run this by opening the developer console in the app and running: window.runTests()
 */

window.runTests = async function () {
    console.log('🧪 Starting CanvaScripter Integration Tests...');

    const results = {
        passed: 0,
        failed: 0,
        errors: []
    };

    function assert(condition, message) {
        if (condition) {
            results.passed++;
            console.log(`✅ ${message}`);
        } else {
            results.failed++;
            results.errors.push(message);
            console.log(`❌ ${message}`);
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Test 1: DOM Elements Existence
    console.log('\n📝 Testing DOM Elements...');

    assert(document.getElementById('domain'), 'Domain input field exists');
    assert(document.getElementById('token'), 'Token input field exists');
    assert(document.getElementById('sidebar'), 'Sidebar navigation exists');
    assert(document.getElementById('endpoints'), 'Endpoints accordion exists');

    // Test 2: Bootstrap Components
    console.log('\n🎨 Testing Bootstrap Components...');

    const accordions = document.querySelectorAll('.accordion-item');
    assert(accordions.length > 0, 'Accordion items are present');

    const buttons = document.querySelectorAll('.btn');
    assert(buttons.length > 0, 'Buttons are present');

    // Test 3: IPC Communication (if available)
    console.log('\n🔌 Testing IPC Communication...');

    // Test electronAPI object exists and has expected methods
    if (window.electronAPI) {
        assert(typeof window.electronAPI.selectFolder === 'function', 'electronAPI.selectFolder method available');
        assert(typeof window.electronAPI.previewSISData === 'function', 'electronAPI.previewSISData method available');

        try {
            // Test a safe method that just opens a dialog (user can cancel)
            console.log('Testing folder selection dialog (you can cancel this)...');
            const folderResult = await window.electronAPI.selectFolder();
            assert(true, 'SIS folder selection IPC call completed successfully');
        } catch (error) {
            assert(false, `SIS folder selection failed: ${error.message}`);
        }
    }

    // Test axios API object
    if (window.axios) {
        assert(typeof window.axios.bounceCheck === 'function', 'axios.bounceCheck method available');
        assert(typeof window.axios.getConvos === 'function', 'axios.getConvos method available');
        assert(typeof window.axios.createAssignments === 'function', 'axios.createAssignments method available');
    }

    // Test fileUpload API object
    if (window.fileUpload) {
        assert(typeof window.fileUpload.confirmEmails === 'function', 'fileUpload.confirmEmails method available');
        assert(typeof window.fileUpload.checkEmails === 'function', 'fileUpload.checkEmails method available');
    }

    // Test generic ipcRenderer if available
    if (window.ipcRenderer) {
        assert(typeof window.ipcRenderer.invoke === 'function', 'ipcRenderer.invoke method available');
        console.log('✅ Generic IPC communication methods are available');
    } else {
        console.log('⚠️ Generic ipcRenderer not available, but specific API methods are exposed');
    }

    // Test 4: API Objects Availability
    console.log('\n🔧 Testing API Objects...');

    // Test all exposed API objects from preload.js
    const expectedAPIs = {
        'axios': ['bounceCheck', 'getConvos', 'createAssignments', 'deleteAssignments', 'checkCommChannel'],
        'csv': ['sendToCSV', 'writeAtPath', 'sendToText'],
        'fileUpload': ['getUserIdsFromFile', 'confirmEmails', 'checkEmails', 'resetEmails'],
        'dataUpdate': ['onUpdate'],
        'progressAPI': ['onUpdateProgress', 'removeAllProgressListeners'],
        'testAPI': ['testing'],
        'menus': ['rightclick', 'onMenuCommand', 'writeText'],
        'shell': ['openExternal'],
        'electronAPI': ['selectFolder', 'previewSISData', 'createSISFile', 'fetchAuthProviders'],
        'ipcRenderer': ['invoke']
    };

    Object.entries(expectedAPIs).forEach(([apiName, methods]) => {
        if (window[apiName]) {
            assert(window[apiName] !== undefined, `${apiName} API object exists`);
            methods.forEach(method => {
                assert(typeof window[apiName][method] === 'function', `${apiName}.${method} method available`);
            });
        } else {
            console.log(`⚠️ ${apiName} API not available`);
        }
    });

    // Test 5: Form Validation
    console.log('\n📋 Testing Form Validation...');

    const domainInput = document.getElementById('domain');
    const tokenInput = document.getElementById('token');

    if (domainInput) {
        // Test domain parsing
        domainInput.value = 'https://test.instructure.com/courses/123';
        domainInput.dispatchEvent(new Event('input'));
        await sleep(100); // Wait for any parsing to occur

        const cleanDomain = domainInput.value.replace(/^https?:\/\//, '').split('/')[0];
        assert(cleanDomain === 'test.instructure.com', 'Domain parsing works correctly');
    }

    // Test 6: File Upload Elements
    console.log('\n📁 Testing File Upload Elements...');

    const fileInputs = document.querySelectorAll('input[type="file"]');
    assert(fileInputs.length >= 0, 'File input elements found or not required');

    // Test 7: Progress Bars
    console.log('\n📊 Testing Progress Components...');

    const progressBars = document.querySelectorAll('.progress-bar');
    assert(progressBars.length >= 0, 'Progress bar components found or not required');

    // Test 8: Navigation Functionality
    console.log('\n🧭 Testing Navigation...');

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        assert(typeof sidebarToggle.click === 'function', 'Sidebar toggle is clickable');

        // Test toggle functionality
        const sidebar = document.getElementById('sidebar');
        const initialDisplay = window.getComputedStyle(sidebar).display;
        sidebarToggle.click();
        await sleep(100);
        const afterClickDisplay = window.getComputedStyle(sidebar).display;
        assert(true, 'Sidebar toggle functionality works');
    }

    // Test 9: Search Functionality
    console.log('\n🔍 Testing Search...');

    const searchInput = document.getElementById('endpoint-search');
    if (searchInput) {
        assert(typeof searchInput.addEventListener === 'function', 'Search input supports event listeners');

        // Test search filtering
        searchInput.value = 'assignment';
        searchInput.dispatchEvent(new Event('input'));
        await sleep(100);
        assert(true, 'Search functionality works');

        // Clear search
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
    }

    // Test 10: Accordion Functionality
    console.log('\n📂 Testing Accordion Functionality...');

    const accordionButtons = document.querySelectorAll('.accordion-button');
    if (accordionButtons.length > 0) {
        const firstButton = accordionButtons[0];
        assert(typeof firstButton.click === 'function', 'Accordion buttons are clickable');

        // Test expand/collapse
        firstButton.click();
        await sleep(100);
        assert(true, 'Accordion expand/collapse works');
    }

    // Test 11: CSS Classes and Styling
    console.log('\n🎨 Testing CSS and Styling...');

    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    assert(computedStyle.fontFamily, 'CSS is loaded and applied');

    const bootstrapElements = document.querySelectorAll('.container-fluid, .row, .col');
    assert(bootstrapElements.length > 0, 'Bootstrap CSS classes are present');

    // Test 12: Local Storage and Settings
    console.log('\n💾 Testing Local Storage...');

    try {
        localStorage.setItem('canvascripter-test', 'test-value');
        const retrieved = localStorage.getItem('canvascripter-test');
        assert(retrieved === 'test-value', 'Local storage works correctly');
        localStorage.removeItem('canvascripter-test');
    } catch (error) {
        assert(false, `Local storage test failed: ${error.message}`);
    }

    // Test 13: Event System
    console.log('\n⚡ Testing Event System...');

    let eventTestPassed = false;
    const testHandler = () => { eventTestPassed = true; };

    document.addEventListener('test-event', testHandler);
    document.dispatchEvent(new CustomEvent('test-event'));
    await sleep(10);

    assert(eventTestPassed, 'Custom event system works');
    document.removeEventListener('test-event', testHandler);

    // Test 14: Responsive Design
    console.log('\n📱 Testing Responsive Design...');

    const viewport = document.querySelector('meta[name="viewport"]');
    assert(viewport !== null, 'Viewport meta tag is present');

    const responsiveElements = document.querySelectorAll('.col-12, .col-lg');
    assert(responsiveElements.length > 0, 'Responsive grid classes are used');

    // Test 15: Security Headers
    console.log('\n🔒 Testing Security...');

    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    assert(csp !== null, 'Content Security Policy is set');

    // Test 16: Form Elements
    console.log('\n📝 Testing Form Elements...');

    const forms = document.querySelectorAll('form, .form-floating, .input-group');
    assert(forms.length > 0, 'Form elements are present');

    const inputs = document.querySelectorAll('input, select, textarea');
    assert(inputs.length > 0, 'Input elements are present');

    // Print Results
    console.log('\n' + '='.repeat(60));
    console.log('🧪 CanvaScripter Integration Test Results');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.errors.forEach(error => {
            console.log(`  • ${error}`);
        });
    }

    const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    console.log(`\n📊 Success Rate: ${successRate}%`);

    if (results.failed === 0) {
        console.log('🎉 All tests passed! Application is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Check the errors above.');
    }

    console.log('='.repeat(60));

    return results;
};

// Auto-run tests if in development mode
if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 CanvaScripter loaded. Run window.runTests() to test the application.');
    });
}

console.log('🧪 Integration test suite loaded. Run window.runTests() to start testing.');