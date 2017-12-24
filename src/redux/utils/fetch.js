'use stric';
import Request from 'request';


export const fetch = (options) => new Promise(
    (resolve, reject) => {
        Request(options, function (error, response, body) {
            if ( error ) {
                return reject(error)
            }


            const getResponseObj = () => response
            try {
                resolve({
                    statusCode: response.statusCode,
                    payload: JSON.parse(body),
                    getResponseObj,
                    body
                })
            } catch (e) {
                resolve({
                    statusCode: response.statusCode,
                    getResponseObj,
                    body
                })
            }
        });
    }
)

export default fetch