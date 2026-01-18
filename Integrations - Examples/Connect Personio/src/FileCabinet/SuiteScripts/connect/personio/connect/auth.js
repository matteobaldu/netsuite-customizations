/**
 * @NApiVersion 2.1
 */
define(['N/encode', 'N/https'], (Encode, Https) => {

    let integration = null;
    const init = (_integration) => {
        integration = _integration
    }

    const getBasicAuthentication = (user, password) => {
        const secureString = Https.createSecureString({
            input: user + ':' + password
        });
        secureString.convertEncoding({
            fromEncoding: Encode.Encoding.UTF_8,
            toEncoding: Encode.Encoding.BASE_64
        });
        const header = Https.createSecureString({
            input: 'Basic '
        });
        header.appendSecureString({
            secureString: secureString,
            keepEncoding: true
        });
        return header;
    }

    const getSecret = (input) => {
        return Https.createSecureString({input});
    }

    return {init, getBasicAuthentication, getSecret}
});
