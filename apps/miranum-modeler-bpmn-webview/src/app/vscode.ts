import {
    BpmnFileQuery,
    BpmnModelerSettingQuery,
    Command,
    ElementTemplatesQuery,
    FormKeysQuery,
    LogErrorCommand,
    LogInfoCommand,
    Query,
    SyncDocumentCommand,
    VsCodeApi,
    VsCodeImpl,
    VsCodeMock,
} from "@miranum-ide/vscode/miranum-vscode-webview";

declare const process: { env: { NODE_ENV: string } };

type StateType = unknown;

type MessageType = Command | Query;

export function getVsCodeApi(): VsCodeApi<StateType, MessageType> {
    if (process.env.NODE_ENV === "development") {
        return new MockedVsCodeApi();
    } else {
        return new VsCodeImpl<StateType, MessageType>();
    }
}

class MockedVsCodeApi extends VsCodeMock<StateType, MessageType> {
    override updateState(): void {
        throw new Error("Method not implemented.");
    }

    override postMessage(message: MessageType): void {
        switch (true) {
            case message.type === "GetBpmnFileCommand": {
                dispatchEvent(new BpmnFileQuery("", "c7"));
                break;
            }
            case message.type === "GetFormKeysCommand": {
                dispatchEvent(new FormKeysQuery(["formKey1", "formKey2"]));
                break;
            }
            case message.type === "GetElementTemplatesCommand": {
                dispatchEvent(new ElementTemplatesQuery([elementTemplate]));
                break;
            }
            case message.type === "GetWebviewConfigCommand": {
                dispatchEvent(new BpmnModelerSettingQuery({ alignToOrigin: true }));
                break;
            }
            case message.type === "SyncDocumentCommand": {
                console.debug(
                    "[Debug] postMessage() SyncDocumentCommand",
                    (message as SyncDocumentCommand).content,
                );
                break;
            }
            case message.type === "LogInfoCommand": {
                console.info((message as LogInfoCommand).message);
                break;
            }
            case message.type === "LogErrorCommand": {
                console.error((message as LogErrorCommand).message);
                break;
            }
            default: {
                throw new Error(
                    `Unknown message type: ${(message as MessageType).type}`,
                );
            }
        }

        function dispatchEvent(event: MessageType) {
            window.dispatchEvent(
                new MessageEvent("message", {
                    data: event,
                }),
            );
        }
    }
}

const elementTemplate = `
{
  "name": "Send E-Mail",
  "id": "de.muenchen.digitalwf.templates.send-email",
  "appliesTo": [
    "bpmn:CallActivity"
  ],
  "properties": [
    {
      "label": "Template",
      "type": "String",
      "editable": false,
      "value": "StreamingTemplateV02",
      "binding": {
        "type": "property",
        "name": "calledElement"
      }
    },
    {
      "label": "Event Topic",
      "type": "String",
      "value": "",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "app_topic_name",
        "target": "app_topic_name"
      },
      "constraints": {
        "notEmpty": true
      }
    },
    {
      "label": "Event Message",
      "type": "String",
      "editable": false,
      "value": "genericEvent",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "app_message_name",
        "target": "app_message_name"
      },
      "constraints": {
        "notEmpty": true
      }
    },
    {
      "label": "Type Header",
      "type": "String",
      "editable": false,
      "value": "sendMailFromEventBus",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "app_type_name",
        "target": "app_type_name"
      },
      "constraints": {
        "notEmpty": true
      }
    },
    {
      "label": "Receiver (CC)",
      "type": "String",
      "value": "",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "receiversCc",
        "target": "receiversCc"
      },
      "constraints": {
        "notEmpty": false
      }
    },
    {
      "label": "Receiver (BCC)",
      "type": "String",
      "value": "",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "receiversBcc",
        "target": "receiversBcc"
      },
      "constraints": {
        "notEmpty": false
      }
    },
    {
      "label": "Receiver",
      "type": "String",
      "value": "",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "receivers",
        "target": "receivers"
      },
      "constraints": {
        "notEmpty": true
      }
    },
    {
      "label": "Subject",
      "type": "String",
      "value": "",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "subject",
        "target": "subject"
      },
      "constraints": {
        "notEmpty": true
      }
    },
    {
      "label": "Body",
      "type": "String",
      "value": "",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "body",
        "target": "body"
      },
      "constraints": {
        "notEmpty": true
      }
    },
    {
      "label": "Reply-To Address",
      "type": "String",
      "value": "",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "replyTo",
        "target": "replyTo"
      }
    },
    {
      "label": "Attachment Paths (S3)",
      "type": "String",
      "value": "",
      "description": "Array of presigned urls created with s3 integration",
      "binding": {
        "type": "camunda:in",
        "expression": true,
        "name": "attachments",
        "target": "attachments"
      },
      "constraints": {
        "notEmpty": false
      }
    },
    {
      "label": "Dispatch Status",
      "value": "mailSentStatus",
      "type": "String",
      "binding": {
        "type": "camunda:out",
        "source": "mailSentStatus"
      },
      "constraints": {
        "notEmpty": false
      }
    }
  ]
}
`;
