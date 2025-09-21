console.log('inside accounts.js')

const axios = require('axios');
const { errorCheck } = require('./utilities');

// const accounts = [
//     215
// ]

// const num = 212;
const accounts = [];

// endpoint = 'https://<domain>/api/v1/accounts/<id>?account[sis_account_id]'
// endpoint = 'https://ecpi.instructure.com/api/v1/accounts/'
endpoint = 'https://domain.instructure.com/api/v1/accounts/';

(async () => {
    const failedAccounts = [];
    for (let account of accounts) {
        const axiosConfig = {
            method: 'PUT',
            url: endpoint + account,
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            data: {
                "account": {
                    "sis_account_id": account.toString()
                }
            }
        };

        try {
            const request = async () => {
                return await axios(axiosConfig);
            };
            const response = await errorCheck(request);
            // console.log('The response is ', response);
        } catch (error) {
            failedAccounts.push(account);
            console.log('Failed to updated ', error);
        }
    }
    console.log(failedAccounts);

    const reFailed = [];
    console.log('Retrying failed accounts...');
    for (let failed of failedAccounts) {
        const axiosConfig = {
            method: 'PUT',
            url: endpoint + failed,
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            data: {
                "account": {
                    "sis_account_id": `${failed.toString()}_${failed.toString()}`
                }
            }
        };

        try {
            const request = async () => {
                return await axios(axiosConfig);
            };
            const response = await errorCheck(request);
            // console.log('The response is ', response.data);
        } catch (error) {
            reFailed.push(account);
            console.log('Failed to updated ', error);
        }
    }

    console.log(reFailed);
})();