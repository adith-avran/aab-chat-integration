export const CONVERSATION_CONSTANTS = {
    /**
     * Status of a conversation in the chat client.
     * @type {String}
     */
    ConversationStatus: {
        NOT_STARTED_CONVERSATION: "NOT_STARTED",
        OPENED_CONVERSATION: "OPEN",
        CLOSED_CONVERSATION: "CLOSED"
    },
    /**
     * Types of events published by Conversation Service in SCRT 2.0.
     * Refer https://developer.salesforce.com/docs/service/messaging-api/references/about/server-sent-events-structure.html
     * @type {String}
     */
    EventTypes: {
        CONVERSATION_MESSAGE: "CONVERSATION_MESSAGE",
        CONVERSATION_PARTICIPANT_CHANGED: "CONVERSATION_PARTICIPANT_CHANGED",
        CONVERSATION_ROUTING_RESULT: "CONVERSATION_ROUTING_RESULT",
        CONVERSATION_TYPING_STARTED_INDICATOR: "CONVERSATION_TYPING_STARTED_INDICATOR",
        CONVERSATION_TYPING_STOPPED_INDICATOR: "CONVERSATION_TYPING_STOPPED_INDICATOR",
        CONVERSATION_DELIVERY_ACKNOWLEDGEMENT: "CONVERSATION_DELIVERY_ACKNOWLEDGEMENT",
        CONVERSATION_READ_ACKNOWLEDGEMENT: "CONVERSATION_READ_ACKNOWLEDGEMENT",
        CONVERSATION_CLOSE_CONVERSATION: "CONVERSATION_CLOSE_CONVERSATION"
    },
    /**
     * Properties of a generic ConversationEntry class instance.
     * @type {String}
     */  
    ConversationEntryProperties: {
        CONVERSATION_ID: "conversationId",
        MESSAGE_ID: "messageId",
        CONTENT: "content",
        MESSAGE_TYPE: "messageType",
        ENTRY_TYPE: "entryType",
        SENDER: "sender",
        ACTOR_NAME: "actorName",
        ACTOR_TYPE: "actorType",
        TRANSCRIPTED_TIMESTAMP: "transcriptedTimestamp",
        MESSAGE_REASON: "messageReason"
    },
    /**
     * Types of conversation entries.
     * @type {String}
     */
    EntryTypes: {
        CONVERSATION_MESSAGE: "Message",
        PARTICIPANT_CHANGED: "ParticipantChanged",
        ROUTING_RESULT: "RoutingResult",
        DELIVERY_ACKNOWLEDGEMENT: "DeliveryAcknowledgement",
        READ_ACKNOWLEDGEMENT: "ReadAcknowledgement",
        TYPING_STARTED_INDICATOR: "TypingStartedIndicator",
        TYPING_STOPPED_INDICATOR: "TypingStoppedIndicator"
    },
    /**
     * The semantic type of a Message entry type, i.e. what a message does.
     * Refer https://developer.salesforce.com/docs/service/messaging-api/references/about/message-types-format-types.html#message-types
     * @type {String}
     */
    MessageTypes: {
        STATIC_CONTENT_MESSAGE: "StaticContentMessage",
        CHOICES_MESSAGE: "ChoicesMessage",
        CHOICES_RESPONSE_MESSAGE: "ChoicesResponseMessage"
    },
    /**
     * The rendering format of a Message entry type, i.e. how it looks.
     * Refer https://developer.salesforce.com/docs/service/messaging-api/references/about/message-types-format-types.html#format-types
     * @type {String}
     */
    FormatTypes: {
        TEXT: "Text",
        BUTTONS: "Buttons",
        QUICK_REPLIES: "QuickReplies",
        SELECTIONS: "Selections"
    },
    /**
     * The role of the sender of events published by Conversation Service in SCRT 2.0.
     * @type {String}
     */
    ParticipantRoles: {
        ENDUSER: "EndUser",
        AGENT: "Agent",
        CHATBOT: "Chatbot",
        SYSTEM: "System",
        ROUTER: "Router",
        SUPERVISOR: "Supervisor"
    },
    /**
     * The operation (i.e. join/leave) of the ParticipantChanged entry type.
     * @type {String}
     */
    ParticipantChangedOperations: {
        ADD: "add",
        REMOVE: "remove"
    },
    /**
     * The routing type, set from the RoutingContext and sent in RoutingResult entries.
     * @type {String}
     */
    RoutingTypes: {
        INITIAL: "Initial",
        TRANSFER: "Transfer"
    },
    /**
     * The current routing status of the conversation, returned from the ConversationStatus API.
     * @type {String}
     */
    RoutingStatus: {
        ROUTED: "ROUTED",
        NEEDS_ROUTING: "NEEDS_ROUTING",
        INITIAL: "INITIAL",
        TRANSFER: "TRANSFER"
    },
    /**
     * How routing failed or succeeded, sent in RoutingResult entries.
     * @type {String}
     */
    RoutingFailureTypes: {
        NO_ERROR: "None",
        UNKNOWN_ERROR: "Unknown",
        SUBMISSION_ERROR: "SubmissionError",
        ROUTING_ERROR: "RoutingError"
    }
};