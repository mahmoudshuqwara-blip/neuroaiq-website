# HealthCoverSim

Private health insurance quote simulator made for CSE3CWA / CSE5006 Assignment 1.

You can create, view, edit and delete quotes, and the app works out the monthly and yearly price for you.

This is just a uni project and isn’t meant to give real insurance prices or financial advice.

**Built with React, Node.js/Express and SQLite.**

\---

## Project Structure

The project is split into two main parts:

* React frontend
* Node.js/Express backend
* SQLite database

\---

## How to Run

Make sure Node.js and npm are installed first.

For the backend:

```bash
npm install
npm start
```

For the frontend:

```bash
npm install
npm run dev
```

Then open the local Vite link in your browser.

\---

## Database

The SQLite database is created automatically when the backend starts, so there’s no extra setup needed.

The database mainly stores the quote details entered by the user.

The final premium is calculated by the app instead of being stored in the database.

\---

## Quote Calculation

The app calculates the quote based on things like:

* Hospital cover
* Extras cover
* Age
* Previous cover history
* Cover type
* Payment option
* Annual discount

Lifetime Health Cover loading is only added to hospital cover when it applies.

Family cover includes two adults and adds a $30 monthly family fee.

If yearly payment is selected, the annual discount is also applied.

\---

## Validation

The app checks the information entered before saving a quote.

This includes things like making sure:

* A name is entered
* Ages are valid
* The cover options are valid
* The second applicant is included when needed
* The yearly discount is within the allowed range

There is validation on both the frontend and backend so invalid information doesn’t get saved.

\---

## AI Use

**Tools used:** ChatGPT and Claude.

**What AI helped me with:**  
I used ChatGPT and Claude mainly to check my code, find errors and help me fix things when something wasn’t working properly. It also helped me clean up parts of the code and gave me ideas for how to approach certain problems. When I got stuck or had a mind block, I sometimes used AI to suggest or generate small parts of code so I could understand how to move forward. For the backend, I used AI more as a guide to help me plan how everything should connect and how to set it up properly. The frontend was more straightforward, so I mostly used AI there to review what I had, improve parts of it and catch mistakes. I also used it for testing ideas and cleaning up the wording in this README.

**What I did myself:**  
The main idea for the project was mine and I planned out how I wanted the app to work before building it. I designed the layout and overall look of the frontend myself and used the lecture content to guide how I structured the project. I decided what features the app needed, how the quote system should work and how the user would move through the app. I also worked through the calculations and logic myself, tested the final result and made sure I understood the code and changes before keeping them. AI helped me when I got stuck or needed another way of looking at something, but the overall project direction, design and final decisions were mine.

**One decision I made myself:**  
One decision I made myself was how the app should be laid out and how the user moves through the quote process. I wanted it to stay simple and easy to follow instead of overcomplicating the interface.

\---

## Limitation

The simulator is simplified and doesn’t work exactly like a real Australian health insurance provider.

For example, the pricing is based on fixed values and doesn’t include every real-world factor that an actual insurer would use.

It’s mainly made to show how the quote system and calculations work.

\---

## API

The backend has API routes for:

* Getting all quotes
* Getting one quote
* Creating a quote
* Editing a quote
* Deleting a quote
* Getting pricing information

The React frontend uses these routes to communicate with the backend and database.

