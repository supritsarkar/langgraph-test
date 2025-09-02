# langgraph-test
LangGraph Arithmetic Agent with Gemini API

This project demonstrates how to build a tool-using AI agent using LangGraph
, powered by Google Gemini API.
The agent can perform arithmetic operations like addition, multiplication, and division by dynamically deciding whether to call a tool or provide a direct response.

🚀 Features

Uses Google Gemini (via LangChain) for reasoning and decision-making.

Implements custom arithmetic tools:

➕ add: Add two numbers

✖️ multiply: Multiply two numbers

➗ divide: Divide two numbers (with zero-check handling)

Utilizes LangGraph for building a state graph (flow of conversation):

llmCall → LLM decides if a tool is needed

toolCall → Executes tool calls when required

Conditional flow → Keeps looping until the answer is computed

Shows how to bind tools to an LLM and integrate them in an agent flow.
