const TEST_MODE = document.URL.includes('http://localhost:');  // true - test mode, false - release mode
const ONLINE_MODE = true;  // true - WLAN, false && TEST_MODE - NO WLAN

const APP_VERSION = '1.3'

const NO_WLAN = TEST_MODE && !ONLINE_MODE;

const testModeIndicatorSpan = document.getElementById('testModeIndicator');

if (TEST_MODE) {
    if (NO_WLAN) {
        testModeIndicatorSpan.innerHTML = `<div><i class="fa-solid fa-bug"></i>DEBUG</div><div style="display: inline;"> <i class="fa-solid fa-plane-up"></i> OFFLINE</div><div><i class="fa-solid fa-mobile-screen-button"></i> v${APP_VERSION}</div>`;
    } else {
        testModeIndicatorSpan.innerHTML = `<div><i class="fa-solid fa-bug"></i>DEBUG</div><div> <i class="fa-solid fa-wifi"></i> WLAN</div><div><i class="fa-solid fa-mobile-screen-button"></i> v${APP_VERSION}</div>`;
    }

} else {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', {scope: './'})
                .catch(console.error);
        });
    }
    testModeIndicatorSpan.innerHTML = `<div><i class="fa-solid fa-check"></i>STABLE</div><div> <i class="fa-solid fa-wifi"></i> WLAN</div><div><i class="fa-solid fa-mobile-screen-button"></i> v${APP_VERSION}</div>`;
}