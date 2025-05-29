function TheEncryption() {
    const input = document.querySelectorAll('input');
    const secretKey = "elvis-banana";

    function Encryption(text) {
        const encryptedText = CryptoJS.AES.encrypt(text, secretKey).toString();
        return encryptedText;
    }

    const encrypted = Encryption(input[0].value);
}