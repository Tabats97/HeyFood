
/* HET FOOD - HCIW Project 2021*/
/* Made by leonardo emili, alessio luciani, andrea trianni, matteo pascolini */

const Alexa = require('ask-sdk-core');
const stringSimilarity = require("string-similarity");

let infoOrder = new Map();
const similarityThr = 0.33;


/* -----------------------  MENU declaration  --------------------- */

const pizzaIngredients = {
    
    // pizze rosse 
    marinara : ['tomato sauce', 'garlic', 'origan'],
    margherita: ['tomato sauce', 'mozzarella cheese', 'fresh basil'],
    bufala: ['tomato sauce', 'bufala cheese'],
    diavola: ['tomato sauce', 'mozzarella cheese', 'pepperoni'],
    napoli : ['tomato sauce', 'mozzarella cheese', 'anchovies'],
    americana: ['tomato sauce', 'mozzarella cheese', 'fridge chips','wurstel'],
    
    //pizze bianche
    boscaiola: ['mozzarella cheese', 'mushrooms', 'sausage'],
    ortolana: ['mozzarella cheese', 'pepper', 'eggplant', 'zucchini'],
    crostino: ['mozzarella cheese', 'backed ham'],
    'quattro formaggi': ['mozzarella', 'parmigiano reggiano', 'fontina'],
    'friarielli salsiccia': ['mozzarella cheese', 'broccoli', 'sausage'],
    patate: ['mozzarella cheese', 'potatoe'],
    
    //focaccie
    'focaccia bianca': ['oil','rosemary'],
    'focaccia caprese': ['mozzarella cheese', 'tomato', 'fresh basil'],
    
    //calzoni
    'calzone cotto mozzarella': ['mozzarella cheese', 'backed ham'],
    'calzone pomodoro mozzarella': ['mozzarella cheese', 'tomato sauce']
    
}

const pizzas = {
    
    marinara: { ingredients: pizzaIngredients['marinara'], price: 4},
    margherita : {ingredients: pizzaIngredients['margherita'], price: 5},
    bufala : {ingredients: pizzaIngredients['bufala'], price: 7},
    diavola: { ingredients: pizzaIngredients['diavola'], price: 6 },
    napoli: { ingredients: pizzaIngredients['napoli'], price: 6 },
    americana: { ingredients: pizzaIngredients['americana'], price: 7},
    
    boscaiola: { ingredients: pizzaIngredients['boscaiola'], price: 7},
    ortolana: { ingredients: pizzaIngredients['ortolana'], price: 6},
    crostino: { ingredients: pizzaIngredients['crostino'], price: 6},
    'quattro formaggi': { ingredients: pizzaIngredients['quattro formaggi'], price: 6},
    'friarielli salsiccia': { ingredients: pizzaIngredients['friarielli salsiccia'], price: 6},
    patate: { ingredients: pizzaIngredients['patate'], price: 5},
    
    'focaccia bianca': { ingredients: pizzaIngredients['focaccia bianca'], price: 4},
    'focaccia caprese': { ingredients: pizzaIngredients['focaccia caprese'], price: 6},
    
    'calzone cotto mozzarella': { ingredients: pizzaIngredients['calzone cotto mozzarella'], price: 6},
    'calzone pomodoro mozzarella': { ingredients: pizzaIngredients['calzone pomodoro mozzarella'], price: 6}
    
}


/* ----------------------------------------------------------------------------------- */



/* --- Launch INTENT --- */

const launchAnswer = [
    "Welcome to Hey Food, the takeaway pizza ordering skill! Which pizza would you like to order?",
    "Hi, my name is Hey Food, I'm here to take your pizza order, what do you want to eat today?",
    "Hi, I'm hey food, your smart waiter, what would you like to order? "
    ]

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {

        // Reset session data
        infoOrder = new Map();
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.confirmationPending = false;
        attributes.finalConfirmPending = false;
        attributes.invalidResponse = 0;
        attributes.pizza = undefined;
        attributes.amount = undefined;
        
        handlerInput.attributesManager.setSessionAttributes(attributes);

        var answer = selectAnswer(launchAnswer,[])
        return handlerInput.responseBuilder
            .speak(answer)
            .reprompt(answer)
            .getResponse();
    }
};



/* --- InfoPizza INTENT --- */

const infoAnswerBad = [
    "It seems like we don\'t have in the menù what you\'re looking for. Which pizza do you want to order?",
    "I'm sorry but we don't have this product in the menù, if you want you can order something else, tell me what you want.",
    "We cannot satisfy you with this request, choose another pizza that is into the menù. What would you like? "
    ]

const infoAnswerFound = [
    "We have***pizza. Its ingredients are:***. Is that okay?",
    "Ok,***pizza is in our menù. Did i get it right? ",
    "Great choice, our***pizza is delicious, so do you confirm?"
    ]

const infoAnswerNotUnd = [
    "Sorry I did not quite get it. Which pizza do you want to order?",
    "Sorry, i haven't heard you very well, can you repeat which pizza do you want, please?",
    "Ok, i have understand only***pizzas, but what kind of pizza do you want?"
    ]
    
const infoAnswerAdded = [
    "You have added*** ***to your order queue. Do you want to add anything else?",
    "Ok, i have written*** *** to your order. Do you want order other pizzas?",
    "OK,*** ***. Something else?"
    ]
    
const infoAnswerQuantity = [
    'How many***do you want?',
    "How many***i have to write down?",
    "Perfect, how many***?"
    ]

const InfoPizzaHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'InfoPizzaHandler';
    },
    handle(handlerInput) {
        
        let pizza = handlerInput.requestEnvelope.request.intent.slots.pizza.value;
        let amount = handlerInput.requestEnvelope.request.intent.slots.amount.value;
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.invalidResponse = 0;
        attributes.confirmationPending = false;
        attributes.amount = amount;
        
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        let pizzaUndefined = typeof pizza === 'undefined';
        
        // Replacing "tu" food with the number 2
        if (!pizzaUndefined && pizza.toLowerCase() === 'tu') {
            pizzaUndefined = true;
            amount = '2';
        }
        
        if (!pizzaUndefined) {

            // Compute the best match
            const bestMatch = getBestMatch(pizza);
            if (bestMatch.rating >= similarityThr) {
                pizza = bestMatch.target;
            } else {
                return handlerInput.responseBuilder
                    .speak(selectAnswer(infoAnswerBad,[]))
                    .reprompt()
                    .getResponse();
            }
            
            attributes.confirmationPending = true;
            attributes.pizza = pizza;
            attributes.invalidResponse = 1;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            
            return handlerInput.responseBuilder
                .speak(selectAnswer(infoAnswerFound,[bestMatch.target, pizzaIngredients[bestMatch.target].join(', ')]))
                .reprompt()
                .getResponse();
        }
        
        if (typeof amount !== 'undefined' && pizzaUndefined && typeof attributes.pizza === 'undefined'){
            // I didn't understand at all
            attributes.invalidResponse = 0;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            
            return handlerInput.responseBuilder
            .speak(selectAnswer(infoAnswerNotUnd,[amount])).reprompt()
            .getResponse();
        }
        
        if (typeof amount !== 'undefined' && pizzaUndefined){
            // I only have the amount
            
            const pizza = attributes.pizza;
            updateNumberOfPizzas(pizza, amount);
            
            attributes.pizza = undefined;
            attributes.amount = undefined;
            attributes.invalidResponse = 1;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            
            return handlerInput.responseBuilder
            .speak(selectAnswer(infoAnswerAdded,[amount,pizza])).reprompt()
            .getResponse();
        }
        
        if (typeof amount !== 'undefined' && !pizzaUndefined){
            // The user asked for {n} {pizza}s
            
            updateNumberOfPizzas(pizza, amount);
            
            attributes.invalidResponse = 1;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            
            return handlerInput.responseBuilder
            .speak(selectAnswer(infoAnswerAdded,[amount,pizza])).reprompt()
            .getResponse();
            
        }
        
        // I only have the type of pizza
        attributes.pizza = pizza;
        attributes.invalidResponse = 2;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        return handlerInput.responseBuilder.speak(selectAnswer(infoAnswerQuantity,[pizza])).reprompt().getResponse();

    }
};



/* --- Recap INTENT --- */

const RecapOrderHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RecapOrder';
    },
    handle(handlerInput){
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        
        if (getMapSize(infoOrder) === 0){
            
            attributes.invalidResponse = 0;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            
            return handlerInput.responseBuilder
                .speak('Your order is empty. Which pizza would you like to order?').reprompt()
                .getResponse();
        }
        
        attributes.invalidResponse = 1;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        let recap = getRecapMessage()
        
        return handlerInput.responseBuilder
            .speak('You have ordered: \n '+ recap + ' up to now. Do you want to add anything else?').reprompt()
            .getResponse();
    }
};



/* --- BackTopPizza INTENT --- */

const backSubmit = [
    "Your order has been submitted. Thanks for using Hey Food. See you soon!",
    "Ok, the order has been received. Thank you for choosing hey food!",
    "Ok, the order is completed, see you this evening in the pizzeria, bye bye!"
    ]


const BackToThePizzaHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BackToThePizzaHandler';
    },
    handle(handlerInput){
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        if (attributes.finalConfirmPending) {
            attributes.finalConfirmPending = false;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            return handlerInput.responseBuilder
            .speak(selectAnswer(backSubmit,[]))
            .getResponse();
        }
        
        
        if (attributes.confirmationPending) {
            attributes.confirmationPending = false;
            if (typeof attributes.amount !== 'undefined') {
                const before = ' , before: ' + JSON.stringify(infoOrder) + ' ' + infoOrder.has(attributes.pizza);
                updateNumberOfPizzas(attributes.pizza, attributes.amount);

                const answer_params = [attributes.amount, attributes.pizza]
                attributes.pizza = undefined;
                attributes.amount = undefined;
                attributes.invalidResponse = 1;
                handlerInput.attributesManager.setSessionAttributes(attributes);
                
                return handlerInput.responseBuilder
                    .speak(selectAnswer(infoAnswerAdded,answer_params)).reprompt()
                    .getResponse();
            } else {
                // Ask for amount
                attributes.invalidResponse = 2;
                handlerInput.attributesManager.setSessionAttributes(attributes);
                return handlerInput.responseBuilder.speak(selectAnswer(infoAnswerQuantity,[attributes.pizza])).reprompt().getResponse();
            }
        }
        attributes.invalidResponse = 0;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        return handlerInput.responseBuilder
            .speak('Which pizza would you like to add?').reprompt()
            .getResponse();
    }
    
};



/* --- OrderFinished INTENT --- */

const OrderFinishedHandler = {
    canHandle(handlerInput){
         return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OrderFinished';
    },
    handle(handlerInput) {
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        
        if (attributes.finalConfirmPending) {
            // User says no after final confirm is pending
            
            const speakOutput = 'Ok let\'s start over! Which pizza would you like to order?';
            
            // Reset session data
            infoOrder = new Map();
            const attributes = handlerInput.attributesManager.getSessionAttributes();
            
            attributes.confirmationPending = false;
            attributes.finalConfirmPending = false;
            attributes.pizza = undefined;
            attributes.amount = undefined;
            attributes.invalidResponse = 0;
            
            handlerInput.attributesManager.setSessionAttributes(attributes);
    
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();

        }
        
        if (attributes.confirmationPending) {
            
            attributes.confirmationPending = false;
            attributes.invalidResponse = 0;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            return handlerInput.responseBuilder
                .speak('Which pizza would you like to order? If you want to complete the order say no.')
                .reprompt('Which pizza would you like to order? If you want to complete the order say no.')
                .getResponse();
        }        
        
        attributes.finalConfirmPending = true;
        attributes.invalidResponse = 1;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        let recap = getRecapMessage();
        
        let total = 0;
        for (const orderedPizza in infoOrder) {
            const quantity = infoOrder[orderedPizza];
            total += pizzas[orderedPizza].price * quantity;
        }
        
        const msg = 'Perfect, your order is ' + total + ' euros. You ordered ' + recap + '. Is the order correct? Otherwise you can start over saying "no".';
        
        return handlerInput.responseBuilder
            .speak(msg)
            .reprompt()
            .getResponse();
        
    }
};



/* ----------------------------- Other standard INTENT -------------------------------- */


const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};



const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        let speakOutput;
        
        switch(attributes.invalidResponse){
            case 0:
                speakOutput = 'Sorry, try with "I want" or "I would like" and the pizza that you want';
                break;
            
            case 1:
                speakOutput = 'Sorry, try with "yes" or "no"';
                break;
            
            case 2:
                speakOutput = 'Sorry, try with a number';
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput).reprompt()
            .getResponse();
    }
};



const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};



const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};



const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};




/* ----------------------- UTILITY FUNCTION  ---------------------- */

function getRecapMessage() {
    let order = '';

    for (var key in infoOrder){
        order += infoOrder[key] + ' ' + key + ' ';
    }

    return order;
}



function updateNumberOfPizzas(key, newValue){
    if (key in infoOrder) {
        infoOrder[key] = parseInt(newValue, 10) + infoOrder[key]
    } else{
        infoOrder[key] = parseInt(newValue);
    }
}



function getBestMatches(pizza, k) {
    const availablePizzas = Object.keys(pizzaIngredients)
    const n = Math.min(k, availablePizzas.length);
    const scores = availablePizzas.map((p) => stringSimilarity.compareTwoStrings(p, pizza))
    availablePizzas.sort((a,b) => scores[availablePizzas.indexOf(b)] - scores[availablePizzas.indexOf(a)])
    return availablePizzas.slice(0, n);
}



function getBestMatch(pizza) {
    const availablePizzas = Object.keys(pizzaIngredients)
    const matches = stringSimilarity.findBestMatch(pizza, availablePizzas);
    return matches.bestMatch;
}



function getMapSize(x) {
    var len = 0;
    for (var count in x) {
            len++;
    }

    return len;
}


function selectAnswer(answers, params) {
    
    var i = Math.floor(Math.random() * answers.length);
    
    if (params.length === 0)
        return(answers[i])
    
    var tokens = answers[i].split("***");
    var finalAnswer = "";
    
    for (var idx in tokens) {
        finalAnswer = finalAnswer + tokens[idx]; 
        if (idx < params.length && idx < tokens.length-1)
            finalAnswer = finalAnswer + " " + params[idx] + " ";
    }
    
    return(finalAnswer);
}


/* ------------------------------------------------------------------ */


exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        InfoPizzaHandler,
        RecapOrderHandler,
        BackToThePizzaHandler,
        OrderFinishedHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();
    