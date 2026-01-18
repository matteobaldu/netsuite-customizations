/**
 * @NApiVersion 2.1
 */
define(['N/crypto', 'N/encode', 'N/error'],

    (Crypto, Encode, Error) => {
        const errorName = 'PARAMETER_ERROR';

        const checkParameters = (params, fields) => {
            for (let f of fields) {
                if (!Object.prototype.hasOwnProperty.call(params, f)) {
                    throw Error.create({name: errorName, message: 'Missing required parameter: ' + f});
                }
            }
        }

        const hashObject = (object) => {
            let hash = Crypto.createHash({algorithm: Crypto.HashAlg.SHA256});
            hash.update({input: JSON.stringify(object), inputEncoding: Encode.Encoding.UTF_8});
            return  hash.digest({outputEncoding: Encode.Encoding.HEX});
        }

        return {checkParameters, hashObject}

    });
