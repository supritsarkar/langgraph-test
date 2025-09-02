import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { config } from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage , ToolMessage } from "@langchain/core/messages";

config();

const llm = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-1.5-flash",
  maxRetries: 1
});

//arithmetic tools
const multiply = tool(
  async ({ a, b }) => {
    return `${a * b}`;
  },
  {
    name: "multiply",// The tool's name (how the LLM knows what to call)
    description: "Multiplies two numbers", // Natural language description, helps LLM decide when to use this tool
    schema: z.object({   // Input validation & structure using Zod
      a: z.number().describe("The first number"),// Required number input, with a description
      b: z.number().describe("The second number"),
    }),
  }
);

const add = tool(
  async ({ a, b }) => {
    return `${a + b}`;
  },
  {
    name: "add",
    description: "add two numbers together",
    schema: z.object({
      a: z.number().describe("The first number"),
      b: z.number().describe("The second number"),
    }),
  }
);

const divide = tool(
  async ({ a, b }) => {
    if (b === 0) {
      return "Error: Division by zero is not allowed.";
    }
    return `${a / b}`;
  },
  {
    name: "divide",
    description: "divide two numbers ",
    schema: z.object({
      a: z.number().describe("The first number"),
      b: z.number().describe("The second number"),
    }),
  }
);

const tools = [multiply, add, divide];//LangChain provides a helper called tool() (or sometimes StructuredTool) that takes:
// A function (what the tool should do).

// Some metadata (name, description, schema).
//let's map the tools to their names
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llm.bindTools(tools);//! now llm knows about the tools we gave a context about the tools






//!llm call functions
//node 1
async function llmCall(state) {//takes state which is given by the user
  //LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",//Think of it like the "master prompt".the context setter / brainwash instruction
      content:
        "you are a helpful assistant tasked woth performing arithmetic on set of inputs",//context
    },
    ...state.messages, //user messages
  ]);
  return {
    messages: [result], //returns the result as an array of messages
  };
}
//? node2:
async function toolName(state) {
  //performs the tool call

  const result = [];
  const lastMessage = state.messages.at(-1);

  if (lastMessage?.tool_calls?.length) {
    //Checks if the last message has any tool_calls.
    for (const toolCall of lastMessage.tool_calls) {
      const tool = toolsByName[toolCall.name];
      if (!tool) throw new Error(`Tool ${toolCall.name} not found`);

      const observation = await tool.invoke(toolCall.args);// e.g. 10 / 2 = 5
      result.push(
        new ToolMessage({
          content: observation,// "5"
          tool_call_id: toolCall.id,// link back to the request ,tool_call_id: toolCall.id → a pointer back to which tool request this answer belongs to.
        })
      );
    }
  }

  return { messages: result };
}

//conditional state
function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  //if llm makes a tool call, we need to perform the tool call
  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  //otherwise we are done
  return "__end__";
}

//! State graph or flow of the graph

const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("toolCall", toolName)
  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, {
    Action: "toolCall",
    __end__: "__end__",
  })
  .addEdge("toolCall", "llmCall")
  .compile();

//(__start__ is a special built-in marker for the beginning of the graph

//!Invoke
const messages = [
  {
    role: "user",
    content: "Add 3 and 4.",
  },
];
const result = await agentBuilder.invoke({ messages });
console.log(result);
