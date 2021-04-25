// Fill these settings

settings = {
  WFInboxShortId: "5faf2e6bc15f",
  TodoistInboxId: "2220137732",
  TodoistToken: "deda2069f74f88e6c205aabc6e836a835017f37b",
  CompleteOnPull: true,
};

// Do not modify below

function convertMarkdownLinks(markdown) {
  return markdown.replace(/\[([^\]]+)\]\(([^\)]+)\)/, '<a href="$2">$1</a>');
}

function convertText(markdown) {
  markdown = markdown.replace(
    /(^|\s)(\*{1})(\s*\b)([^\*]*)(\b\s*)(\2)/,
    "$1<i>$4</i>"
  );
  markdown = markdown.replace(
    /(^|\s)(_{1})(\s*)([^_]+)(\s*)(\2)/,
    "$1<i>$4</i>"
  );
  markdown = markdown.replace(
    /(^|\s)(\*{2})(\s*\b)([^\*]*)(\b\s*)(\2)/,
    "$1<b>$4</b>"
  );
  markdown = markdown.replace(
    /(^|\s)(_{2})(\s*)([^_]+)(\s*)(\2)/,
    "$1<b>$4</b>"
  );
  markdown = markdown.replace(
    /(^|\s)(\*{3})(\s*\b)([^\*]*)(\b\s*)(\2)/,
    "$1<b><i>$4</i></b>"
  );
  return markdown.replace(
    /(^|\s)(_{3})(\s*)([^_]+)(\s*)(\2)/,
    "$1<b><i>$4</i></b>"
  );
}

function convertTags(message) {
  return message.replace(/(^|\s)\+(\w+)/, "$1#$2");
}

function buildNodeName(msg) {
  nodeName = msg.content;
  nodeName = convertMarkdownLinks(nodeName);
  nodeName = convertTags(nodeName);
  nodeName = convertText(nodeName);
  if (msg.due) {
    date = new Date(msg.due.date);
    nodeName = `${nodeName} ${dateToString(date)}`;
  }
  return nodeName;
}

function dateToString(date) {
  alias = date.toLocaleDateString("en", {
    month: "short",
    weekday: "short",
    day: "numeric",
    year: "numeric",
  });
  return `<time startYear="${date.getFullYear()}" startMonth="${
    date.getMonth() + 1
  }" startDay="${date.getDate()}">${alias}</time>`;
}

function reorderMessages(messages) {
  return messages.sort((a, b) => {
    if (a.parent)
      if (b.parent) return b.order - a.order;
      else return 1;
    else if (b.parent) return -1;
    else return a.order - b.order;
  });
}

function pullTodoistItems({
  WFInboxShortId,
  TodoistInboxId,
  TodoistToken,
  CompleteOnPull,
}) {
  inboxId = WF.shortIdToId(WFInboxShortId);
  WFInbox = WF.getItemById(inboxId);
  nodeTree = {};
  console.log("Fetching new todoist messages...");
  fetch(`https://api.todoist.com/rest/v1/tasks?project_id=${TodoistInboxId}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${TodoistToken}`,
    },
  })
    .then((response) => response.json())
    .then((messages) => {
      todoistIdToWfItem = {};
      messages = reorderMessages(messages);
      while (messages.length > 0) {
        msg = messages.shift();
        if (!msg.parent || msg.parent in todoistIdToWfItem) {
          console.log(`Adding node ${msg.content}...`);
          nodeName = buildNodeName(msg);

          if (msg.parent in todoistIdToWfItem) {
            parent_item = todoistIdToWfItem[msg.parent];
            item = todoistIdToWfItem[msg.parent].addChild();
          } else item = WFInbox.data.addChild();

          WF.setItemName(WF.getItemById(item.id), nodeName);
          todoistIdToWfItem[msg.id] = item;

          if (CompleteOnPull)
            fetch(`https://api.todoist.com/rest/v1/tasks/${msg.id}/close`, {
              method: "POST",
              headers: {
                authorization: `Bearer ${TodoistToken}`,
              },
            }).catch((err) => {
              WF.showMessage(err.toString());
            });
        } else body.push(msg);
      }
    })
    .catch((err) => {
      WF.showMessage(
        `An error occurred when pulling node from todoist: ${err.toString()}`
      );
    });
}

pullTodoistItems(settings);
