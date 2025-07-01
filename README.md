# Legal-GPT

Legal-GPT is a full-stack web application that provides general legal information and insights using an AI-powered chatbot. The project consists of a Next.js + Tailwind CSS frontend and a Flask backend that connects to an Azure Foundry OpenAI GPT-4o-mini model. The Azure Foundry model was fine-tuned with the Indian Constitution, Indian Penal Code(IPC) and Criminal Procedure Code(CRPC) using this dataset: https://www.kaggle.com/datasets/akshatgupta7/llm-fine-tuning-dataset-of-indian-legal-texts

## Features

- **User Authentication**: Sign up, log in, and log out securely.
- **Chatbot Interface**: Ask legal questions and receive AI-generated responses.
- **Chat History**: View previous questions and answers.
- **Modern UI**: Built with Next.js and styled using Tailwind CSS.

## Tech Stack

- **Frontend**: Next.js (React), Tailwind CSS
- **Backend**: Flask (Python), SQLite
- **AI Model**: Azure Foundry GPT (configurable via environment variables)
- **API Communication**: RESTful endpoints
