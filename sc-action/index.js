const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);

  fetch('http://127.0.0.1:3000')
  .then(res => res.text())
  .then(text => console.log(text));

} catch (error) {
  core.setFailed(error.message);
}