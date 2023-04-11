// Re-order chart categories
var newOrder = ['Available', 'Pledged', 'Not Started', 'Active Loans', 'Account', '12+ Mths', '6-12 Mths', '3-6 Mths', '0-3 Mths', '0-3 Mths Overdue', '3-6 Mths Overdue', '6-12 Mths Overdue', '12+ Mths Overdue', 'Balance'];
var d = Highcharts.charts[0].series[0].data;
var d2 = newOrder.map(l=>d.find(v=>v.category===l)).filter(x=>x).map(d => ({name:d.name,y:d.y,color:d.color,borderColor:d.borderColor,dataLabels:d.y<0?{style:{color:"white"}}:void 0,isIntermediateSum:d.isIntermediateSum}));
Highcharts.charts[0].update({xAxis:{categories:newOrder}, series:[{name:"Value",data:d2}]}, true);

// Re-define dataTables function
window.loadDatatable = function(a) {
    var t, e = $("#".concat(a, ".datatable-sort")), d = "/datatables/pledges/" + a, l = this.project, s = this.loan;
    e.length && (t = e.data("walletIds").length ? e.data("walletIds") : [],
    e.dataTable({
        ajax: {
            url: d,
            type: "GET",
            dataSrc: "Data",
            data: {
                walletIds: t
            }
        },
        columns: [{
            data: "project",
            render: function(a, t, e) {
                return "<a href=" + (e.id ? l.replace(":id", e.id) : s.replace(":loanId", e.loanId).replace(":pledgeId", e.pledgeId)) + " class='text-dark'>" + a + "</a>"
            }
        }, {
            data: "pledge_type"
        }, {
            data: "contribution"
        }, {
            data: "interest_rate",
            render: function (a, t, e) {
                return `${a}<br/>${formatDuration((e.loan_end_timestamp - e.loan_start_timestamp) * 1000)}`;
            }
        }, {
            data: {
                display: "loan_start_display",
                sort: "loan_start_timestamp"
            },
            render: function (a, t, e) {
                return formatDate(new Date(e.loan_start_timestamp*1000));
            }
        }, {
            data: {
                display: "loan_end_display",
                sort: "loan_end_timestamp"
            },
            render: function(a, t, e) {
                const isDue = (e.status !== "Paid Back") && (e.loan_end_timestamp * 1000) < Date.now();
                const style = isDue ? "color: red;" : "";
                return `<span style="${style}">${formatDate(new Date(e.loan_end_timestamp*1000))}</span>`;
            }
        }, {
            data: "status",
            render: function (a, t, e) {
                const isDue  = (e.status !== "Paid Back") && (e.loan_end_timestamp * 1000) < Date.now();
                return isDue ? `Due<br/>(${formatDuration(Date.now() - e.loan_end_timestamp * 1000)} ago)` : a;
            }
        }, {
            data: "expected_interest"
        }, {
            data: "interest_paid",
            render: function (a, t, e) {
                const v = parseFloat(a.substring(1))
                const w = parseFloat(e.expected_interest.substring(1));
                const x = parseFloat(e.contribution.substring(1).replaceAll(",",""));
                const r = v / w;
                const isDue  = (e.status !== "Paid Back") && (e.loan_end_timestamp * 1000) < Date.now();
                const d = isDue ? (Date.now() - e.loan_end_timestamp * 1000) / 86400000 : 0;
                const i = parseFloat(e.interest_rate)/1000 + 0.02;
                const out = [a];
                if (v > 0) {
                    out.push(`(${Math.round(r*100)}%)`);
                }
                if (r < 1) {
                    const z = (1-r) * (x + w) + (x * d * i / 365);
                    const formatter = Intl.NumberFormat(["en-GB"], { style: "currency", currency: "GBP" });
                    out.push(`<span style="color:red">${formatter.format(z)}`);
                }
                return out.join("<br/>");
            }
        }, {
            data: "received"
        }],
        createdRow: function(a, t, e) {
            $(a).addClass("small"),
            $(a).addClass("text-center")
        },
        bDestroy: true,
    }),
    e.width("100%"))
};

// Re-load table details
const pledgeTypes = ['started', 'completed', 'not-started', 'not-received'];
const urls = {
    'project': "https://www.crowdproperty.com/projects/:id",
    'loan': "https://www.crowdproperty.com/account/loans/:loanId/pledge/:pledgeId"
};
pledgeTypes.forEach(window.loadDatatable, urls);

/**
 * @param {number} delta
 */
function formatDuration (delta) {
    const ONE_DAY = 86400000;
    const ONE_YEAR = ONE_DAY * 365;
    const ONE_MONTH = ONE_YEAR / 12;

    if (delta < ONE_DAY) {
        return "Today";
    }

    if (delta < ONE_MONTH) {
        const n = Math.round(delta / ONE_DAY);
        return n === 1 ? `1 Day` : `${n} Days`;
    }

    if (delta < ONE_YEAR) {
        const n = Math.round(delta / ONE_MONTH);
        return n === 1 ? "1 Month" : `${n} Months`;
    }

    let n = Math.floor(delta / ONE_YEAR);
    let m = Math.round((delta - (n * ONE_YEAR)) / ONE_MONTH);
    if (m === 12) {
        n++;
        m = 0;
    }
    return `${n === 1 ? "1 Year" : `${n} Years`} ${m === 0 ? "" : (m === 1 ? "1 Month" : `${m} Months`)}`;
}

/**
 * @param {Date} d
 */
function formatDate (d) {
    return d.toISOString().substring(0,10).replace(/-/g, "\u2011");
}