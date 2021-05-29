/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const stringSimilarity = require("string-similarity");
let infoOrder = new Map();
const similarityThr = 0.33;

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to Hey Food, the takeaway pizza ordering skill! Which pizza would you like to order?';
        const hint = ' For example you can ask me for a pepperoni pizza with extra cheese, and I will suggest you the most similar pizza available on the menu.'
        
        // Reset session data
        infoOrder = new Map();
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.confirmationPending = false;
        attributes.finalConfirmPending = false;
        attributes.pizza = undefined;
        attributes.amount = undefined;
        handlerInput.attributesManager.setSessionAttributes(attributes);

        return handlerInput.responseBuilder
            //.speak(JSON.stringify(infoOrder) + ' ' + speakOutput + hint)
            .speak(speakOutput + hint)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const pizzaIngredients = {
    neapolitan: ['tomato', 'mozzarella cheese'],
    pepperoni: ['tomato', 'cheese', 'pepperoni'],
    diavola: ['tomato', 'cheese', 'pepperoni'],
    margherita: ['tomato', 'mozzarella cheese', 'fresh basil'],
    cheese: ['mozzarella', 'provolone'],
    'quattro formaggi': ['tomato', 'mozzarella', 'parmigiano reggiano', 'fontina']
}

const pizzas = {
    neapolitan: { ingredients: pizzaIngredients['neapolitan'], price: 10 },
    pepperoni: { ingredients: pizzaIngredients['pepperoni'], price: 12 },
    diavola: { ingredients: pizzaIngredients['diavola'], price: 12 },
    margherita: { ingredients: pizzaIngredients['margherita'], price: 8 },
    cheese: { ingredients: pizzaIngredients['cheese'], price: 11 },
    'quattro formaggi': { ingredients: pizzaIngredients['quattro formaggi'], price: 14 },
}

const InfoPizzaHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'InfoPizzaHandler';
    },
    handle(handlerInput) {
        
        let pizza = handlerInput.requestEnvelope.request.intent.slots.pizza.value;
        const amount = handlerInput.requestEnvelope.request.intent.slots.amount.value;
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        
        attributes.confirmationPending = false;
        attributes.amount = amount;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        if (typeof pizza !== 'undefined') {
            // Compute the best match
            const bestMatch = getBestMatch(pizza);
            if (bestMatch.rating >= similarityThr) {
                pizza = bestMatch.target;
            } else {
                return handlerInput.responseBuilder
                    .speak('Similarity score is ' + bestMatch.rating + '. It seems like we don\'t have what you\'re looking for. Which pizza do you want to order?')
                    .reprompt()
                    .getResponse();
            }
            
            attributes.confirmationPending = true;
            attributes.pizza = pizza;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            return handlerInput.responseBuilder
                .speak('I found ' + bestMatch.target + ' pizza. Its ingredients are: ' + pizzaIngredients[bestMatch.target].join(', ') + '. Is that okay?')
                .reprompt()
                .getResponse();
        }
        
        if (typeof amount !== 'undefined' && typeof pizza === 'undefined' && typeof attributes.pizza === 'undefined'){
            // I didn't understand at all
            
            return handlerInput.responseBuilder
            .speak('Sorry I did not quite get it. Which pizza do you want to order?').reprompt()
            .getResponse();
        }
        
        if (typeof amount !== 'undefined' && typeof pizza === 'undefined'){
            // I only have the amount
            
            const pizza = attributes.pizza;
            updateNumberOfPizzas(pizza, amount);
            
            attributes.pizza = undefined;
            attributes.amount = undefined;
            
            return handlerInput.responseBuilder
            .speak('You have added ' + amount + ' ' + pizza + ' to your order queue. Do you want to add something else?').reprompt()
            .getResponse();
        }
        
        if (typeof amount !== 'undefined' && typeof pizza !== 'undefined'){
            // The user asked for {n} {pizza}s
            
            updateNumberOfPizzas(pizza, amount);
            
            return handlerInput.responseBuilder
            .speak('Ysou have added ' + amount + ' ' + pizza + ' to your order. Do you want to add something else?').reprompt()
            .getResponse();
            
        }
        
        // I only have the type of pizza
        attributes.pizza = pizza;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        return handlerInput.responseBuilder.speak('How many ' + pizza + ' do you want?').reprompt().getResponse();

    }
};

const RecapOrderHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RecapOrder';
    },
    handle(handlerInput){
        
        if (infoOrder.size === 0){
            return handlerInput.responseBuilder
                .speak('Your order is empty. Which pizza would you like to order?').reprompt()
                .getResponse();
        }
        
        let order = '';
        for (let [key, value] of infoOrder.entries()){
            order += value + ' ' + key + ' ';
        }
        
        return handlerInput.responseBuilder
            .speak('You have ordered: \n '+ order + ' up to now. Do you want to add something else?').reprompt()
            .getResponse();
    }
};

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
            .speak('Your order has been submitted. Thanks for using Hey Food. See you soon!')
            .getResponse();
        }
        
        
        if (attributes.confirmationPending) {
            attributes.confirmationPending = false;
            if (typeof attributes.amount !== 'undefined') {
                const before = ' , before: ' + JSON.stringify(infoOrder) + ' ' + infoOrder.has(attributes.pizza);
                updateNumberOfPizzas(attributes.pizza, attributes.amount);
                const after = attributes.amount + ' ' + attributes.pizza +' , after: ' + JSON.stringify(infoOrder);
                //const res = before + ' ' + after + ', You have added ' + attributes.amount + ' ' + attributes.pizza + ' to your order. Do you want to add something else?'
                const res = 'You have added ' + attributes.amount + ' ' + attributes.pizza + ' to your order. Do you want to add something else?'
                attributes.pizza = undefined;
                attributes.amount = undefined;
                handlerInput.attributesManager.setSessionAttributes(attributes);
                return handlerInput.responseBuilder
                    .speak(res).reprompt()
                    .getResponse();
            } else {
                // Ask for amount
                return handlerInput.responseBuilder.speak('How many ' + attributes.pizza + ' do you want?').reprompt().getResponse();
            }
        }
        return handlerInput.responseBuilder
            //.speak(JSON.stringify(infoOrder) + ' ' + attributes.pizza + ' ' + attributes.amount + ' Which pizza would you like to add?').reprompt()
            .speak('Which pizza would you like to add?').reprompt()
            .getResponse();
    }
    
};

const OrderFinishedHandler = {
    canHandle(handlerInput){
         return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OrderFinished';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        
        if (attributes.finalConfirmPending) {
            // User says no after final confirm is pending
            const speakOutput = 'Welcome to Hey Food, the takeaway pizza ordering skill! Which pizza would you like to order?';
            
            // Reset session data
            infoOrder = new Map();
            const attributes = handlerInput.attributesManager.getSessionAttributes();
            attributes.confirmationPending = false;
            attributes.finalConfirmPending = false;
            attributes.pizza = undefined;
            attributes.amount = undefined;
            handlerInput.attributesManager.setSessionAttributes(attributes);
    
            return handlerInput.responseBuilder
                //.speak(JSON.stringify(infoOrder) + ' ' + speakOutput)
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();

        }
        
        if (attributes.confirmationPending) {
            attributes.confirmationPending = false;
            return handlerInput.responseBuilder
                .speak('Which pizza would you like to order? If you want to complete the order say no.')
                .reprompt('Which pizza would you like to order? If you want to complete the order say no.')
                .getResponse();
        }        
        
        attributes.finalConfirmPending = true;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        let recap = getRecapMessage()
        recap = JSON.stringify(infoOrder);
        
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
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
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
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
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

function getRecapMessage() {
    let order = '';
    for (let [key, value] of infoOrder.entries()){
        order += value + ' ' + key + ' ';
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

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
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
