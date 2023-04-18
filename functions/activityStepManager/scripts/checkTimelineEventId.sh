# la data in cui è stato controllata la logica della lambda rispetto al file TimelineEventId,java
APP_LAST_CHECK_DATE="2023-04-18"

headBranch=$(git for-each-ref --format='%(objectname) %(refname:short)' refs/heads | awk "/^$(git rev-parse HEAD)/ {print \$2}")   
BRANCH=develop

if [[ "$headBranch" == *hotfix* || "$headBranch" == *main* ]]; then
    BRANCH=main
fi

echo "pn-delivery-push $BRANCH"
cd /tmp/
git clone https://github.com/pagopa/pn-delivery-push.git
cd pn-delivery-push
git checkout $BRANCH
filePath="src/main/java/it/pagopa/pn/deliverypush/dto/timeline/TimelineEventId.java"
GIT_LAST_MODIFICATION_DATE=$(git log -1 --pretty="format:%ci" ${filePath})
echo "GIT Last modification date: "$GIT_LAST_MODIFICATION_DATE
echo "APP Last check date: "$APP_LAST_CHECK_DATE

if [[ $GIT_LAST_MODIFICATION_DATE > $APP_LAST_CHECK_DATE ]];
then
    echo "A check on ${filePath} is required since it has been modified after ${APP_LAST_CHECK_DATE}"
    break
else
    echo "The sensor is up-to-date with ${filePath}"
fi                           

rm -rf /tmp/pn-delivery-push