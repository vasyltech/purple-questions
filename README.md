# Purple Questions

<img width="1435" alt="Screen Shot 2025-01-29 at 5 34 25 PM" src="https://github.com/user-attachments/assets/b769cb23-8142-40cd-b1d3-4775c486187c" />


## Overview
Purple Questions is a research project focused on developing an AI-powered virtual assistant. The primary objective is to transform your business knowledge and customer support efforts into a tangible asset. By leveraging LLM technology and minimizing dependencies, this project offers a cost-effective and efficient way to automate customer interactions and support tasks.

## Features
- **Different AI-Training Method**: Unlike traditional vector-based approaches, we use a more effective method for training AI on customized data.
- **Cost-Effective**: Handling an average customer support request costs approximately one cent with commoditized LLMs.
- **You Own Your Data**: All trained materials and operational data, including vectors and indexed conversations, remain under your control.
- **Handles Complex Requests**: Automates support tasks that require external information retrieval, such as subscription status and third-party service integration.
- **Minimizes Dependencies**: Uses LanceDB for persistent local storage, eliminating reliance on external services.
- **Custom User Experience**: API-first design allows for complete flexibility in user interaction.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (latest LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation
1. Clone the repository:
   ```sh
   git clone git@github.com:vasyltech/purple-questions.git
   cd purple-questions
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### Running the Application
To start the application in development mode, use:
```sh
npm run start
```

### Building the Application
To create a production-ready build, run:
```sh
npm run make
```

This will generate distributable files for your platform.

## Motivation & Behind-the-Scenes
The Purple Questions project originated from my experience with the Advanced Access Manager WordPress plugin. Customer support demands grew significantly, consuming time that could have been used for development. Over time, I realized that the effort invested in customer support should not be lost but instead transformed into an asset.

By automating support interactions and leveraging AI, businesses can enhance customer service while minimizing operational costs. The project is built with the vision of making customer support more efficient, scalable, and valuable for businesses.

## Get Involved
I welcome contributors and end users to join me on this journey. If you're interested in collaborating or using Purple Questions, feel free to start conversation by opening an issue.

## License
This project is licensed under an open-source license. See `LICENSE` for more details.

---

> **Note:** While the project is still in its early stages, a real-world implementation is already in use with the [Advanced Access Manager WordPress plugin](https://aamportal.com), showcasing its capabilities in enhancing online customer support.
