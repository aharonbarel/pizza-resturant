const pLimit = require('p-limit');
const repository = require('./db/repository');

const orders =
    [
        {
            id: 1,
            toppings: ['olive', 'tomatos', 'extra cheese', 'tomatos', 'mushrooms', 'extra cheese', 'tomatos'],
            startTime: 0,
            endTime: 0
        },
        {
            id: 2,
            toppings: ['extra cheese', 'tomatos', 'mushrooms'],
            startTime: 0,
            endTime: 0
        },
        {
            id: 3,
            toppings: ['olive', 'tomatos'],
            startTime: 0,
            endTime: 0
        }
    ];

const Report = {
    start: 0,
    end: 0,
    printReport: async function (orders) {
        await repository.publishReport({report: this, orders: orders})
    }
};

//Times
const DOUGH_TIME = 7000;
const TOPPINGS_TIME = 4000;
const OVEN_TIME = 10000;
const SERVING_TIME = 5000;

// Restaurant availability workers
const AVAILABLE_DOUGH_CHEF = 2;
const AVAILABLE_TOPPINGS_CHEF = 3;
const PARALLEL_TOPPING = 2;
const AVAILABLE_OVEN = 1;
const AVAILABLE_SERVING = 2;

// Limitation at restaurant

const limitDough = pLimit(AVAILABLE_DOUGH_CHEF);
const limitOven = pLimit(AVAILABLE_OVEN);
const limitServing = pLimit(AVAILABLE_SERVING);
const limitChefsToppings = pLimit(AVAILABLE_TOPPINGS_CHEF * PARALLEL_TOPPING);

let readyPizzaCounter = 0;

// The pizza restaurant pipeline: Dough chef -> Topping chef -> Oven -> Serving
Report.start = new Date().getTime();
Promise.all(orders.map((order) => {
    return dough(order)
}));

/**
 * process dough by {@link limitDough} and returns promise.
 * Also, when process is done invoked the {@link putToppings} pipline.
 */
function dough(order) {
    return limitDough(() => {
        return new Promise((resolve, reject) => {
            order.startTime = new Date().getTime();
            console.log(`[${time(new Date())}] - order #${order.id} - starting Dough`);
            setTimeout(() => {
                console.log(`[${time(new Date())}] - order #${order.id} - finishing Dough`);
                resolve();
            }, DOUGH_TIME)
        })
    }).then(() => {
        putToppings(order)
    });
}

/**
 * process toppings by {@link toppingsChef} and returns promise.
 * Also, when process is done invoked the {@link putToppings} pipline.
 */
function putToppings(order) {
    Promise
        .all(order.toppings.map((topping) => {
            return toppingsChef(order, topping);
        }))
        .then(() => {
            console.log(`[${time(new Date())}] - order #${order.id} - finish toppings`);
            oven(order);
        });
}

function toppingsChef(order, topping) {
    return limitChefsToppings(() => {
        console.log(`[${time(new Date())}] - order #${order.id} - start put ${topping}`);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log(`[${time(new Date())}] - order #${order.id} - end put ${topping}`);
                resolve();
            }, TOPPINGS_TIME)
        });
    })
}

function oven(order) {
    return limitOven(() => {
        console.log(`[${time(new Date())}] - order #${order.id} - start oven`);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log(`[${time(new Date())}] - order #${order.id} - finish oven`);
                resolve();
            }, OVEN_TIME)
        });
    }).then(() => {
        serving(order);
    })
}

/**
 * process serving by {@link limitServing} and returns promise.
 * Also, when process is done invoked the {@link putToppings} pipline.
 */
function serving(order) {
    return limitServing(() => {
        console.log(`[${time(new Date())}] - order #${order.id} - start serving`);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                readyPizzaCounter++;
                console.log(`[${time(new Date())}] - order #${order.id} - finish serving`);
                resolve()
            }, SERVING_TIME)
        });
    }).then(() => {
        order.endTime = new Date().getTime();
        if (readyPizzaCounter === orders.length) {
            console.log("*****finish all*****");
            Report.end = new Date().getTime();
            Report.printReport(orders);
        }
    })
}

/**
 * converts given date to yyyy-mm-dd hh:mm:ss format
 */
function time(date) {
    return date.getFullYear() +
        "-" + (date.getMonth() + 1) +
        "-" + appendZeroes(date.getDate()) +
        " " + appendZeroes(date.getHours()) +
        ":" + appendZeroes(date.getMinutes()) +
        ":" + appendZeroes(date.getSeconds())
}

/**
 * appends leading zeros for a number if less than 10
 */
function appendZeroes(number) {
    if (number <= 9) {
        return "0" + number;
    }
    return number
}