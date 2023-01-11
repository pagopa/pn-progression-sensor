let options = {
    "sonar.organization": "pagopa",
    "sonar.projectKey": "pagopa_pn-progression-sensor_function1"
}

if (typeof process.env.PR_NUM !== 'undefined' ) {
    options["sonar.pullrequest.base"] = process.env.BRANCH_TARGET;
    options["sonar.pullrequest.branch"] = process.env.BRANCH_NAME;
    options["sonar.pullrequest.key"] = process.env.PR_NUM;
}

import scanner from "sonarqube-scanner";

scanner(
  {
    serverUrl: "https://sonarcloud.io",
    options: options
  },
  () => process.exit()
);