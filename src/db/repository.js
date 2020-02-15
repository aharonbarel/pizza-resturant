const {Client} = require('pg');

const client = new Client({
    host: 'db',
    port: 5432,
    user: 'postgres',
    password: '1234',
    database: 'postgres'
});

function createPgConnection() {
    client.connect(err => {
        if (err) {
            console.error('connection error', err.stack)
        } else {
            console.log('connected')
        }
    });
}

function initTables() {

    client.query(
            `
            create table if not exists report
            (
                id               serial    not null,
                preperation_time varchar(10) not null,
                primary key (id)
            );

    `,
        function (err, res) {
            if (err) {
                console.log(err);
                throw err;
            }
            console.log(res);
            /*client.end();*/
        }
    );

    client.query(
            `
        create table if not exists order_report
        (
            order_id   serial    not null,
            preperation_time varchar(10) not null,
            report_id  integer,
            primary key (order_id),
            foreign key (report_id) references report (id)
        );
    `,
        function (err, res) {
            if (err) {
                console.log(err);
                throw err;
            }
            console.log(res);
            /*client.end();*/
        }
    );
}

createPgConnection();
initTables();

module.exports = {

    publishReport: async function (ordersReport) {
        if (client._connected) {
            const reportId = 1;
            console.log("==============");
            console.log("Orders Report:");
            console.log("==============");
            const report = ordersReport.report;
            let ordersPreparationTime = (report.end - report.start) / 1000;
            console.log(`all orders preparation time took ${ordersPreparationTime} seconds`);
            await client.query(
                "INSERT INTO report (id, preperation_time)  VALUES ($1, $2)",
                [reportId, ordersPreparationTime]);
            await this.publishOrdersAndReport(ordersReport, reportId);
        }
    },
    publishOrdersAndReport: async function (ordersReport, reportId) {
        let orders = ordersReport.orders;
        try {
            for (let i = 0; i < orders.length; i++) {
                let orderPreparationTime = (orders[i].endTime - orders[i].startTime) / 1000;
                console.log(`order #${orders[i].id} took ${orderPreparationTime} seconds`);
                await client.query(
                    "INSERT INTO order_report (order_id, preperation_time, report_id)  VALUES ($1, $2, $3)",
                    [orders[i].id, orderPreparationTime, reportId],
                    function (err, res) {
                        if (err) {
                            console.log(err);
                            throw err;
                        }
                    });
            }
        } catch (e) {
            console.log(e);
        }
    }
};