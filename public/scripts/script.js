function connectRcon() {
    const ipInput = document.getElementById('ip');
    const portInput = document.getElementById('port');
    const captchaInput = document.getElementById('captcha');
    const passwordInput = document.getElementById('password');
    const capthaSvg = document.getElementById('captchaSvg');

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                window.location.reload();
            } else {
                const error = JSON.parse(xhr.responseText);
                const captcha = error.captcha;

                errorDiv.innerHTML = error.error ? error.error : 'Unkown error';

                if (captcha) {
                    capthaSvg.innerHTML = captcha;
                }
            }
        }
    };

    xhr.open('POST', '/connect', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(
        'ip=' + encodeURIComponent(ipInput.value) +
        '&port=' + encodeURIComponent(portInput.value) +
        '&password=' + encodeURIComponent(passwordInput.value) +
        '&captcha=' + encodeURIComponent(captchaInput.value)
    );
}

function sendRconCommand() {
    const commandInput = document.getElementById('command');
    const responseDiv = document.getElementById('responseDiv');

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                responseDiv.innerHTML = xhr.responseText;
            } else {
                const error = JSON.parse(xhr.responseText);
                responseDiv.innerHTML = error.error ? error.error : 'Unkown error';
            }
        }
    };

    xhr.open('POST', '/sendCommand', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send('command=' + encodeURIComponent(commandInput.value));
}