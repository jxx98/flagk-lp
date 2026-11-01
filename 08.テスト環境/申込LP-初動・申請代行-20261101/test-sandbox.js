(() => {
window.gtag=()=>{};window.dataLayer=[];
const notify=text=>{const box=document.querySelector('.test-toast');box.textContent=text;box.hidden=false;clearTimeout(window.testToastTimer);window.testToastTimer=setTimeout(()=>box.hidden=true,5000)};window.testNotify=notify;
document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();notify('テスト環境のため送信していません。入力内容は外部へ送られません。')},true);
HTMLFormElement.prototype.submit=function(){notify('テスト環境のため送信していません。')};
window.fetch=()=>Promise.reject(new Error('Network disabled in test environment'));
XMLHttpRequest.prototype.send=function(){throw new Error('Network disabled in test environment')};
if(navigator.sendBeacon)navigator.sendBeacon=()=>false;
})();