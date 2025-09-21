// questionAsker.js
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


async function questionAsker(question) {
    return new Promise(resolve => {
        rl.question(question, answer => {
            resolve(answer);
        });
    });
}


async function questionDetails(myQuestion) {
    let theAnswer = await questionAsker(myQuestion);
    return theAnswer;
};

function close() {
    rl.close();
}
module.exports = {
    questionDetails, close
};
