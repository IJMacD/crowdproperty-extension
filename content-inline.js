// Re-order chart categories
var newOrder = ['Available', 'Pledged', 'Not Started', 'Active Loans', 'Account', '12+ Mths', '6-12 Mths', '3-6 Mths', '0-3 Mths', '0-3 Mths Overdue', '3-6 Mths Overdue', '6-12 Mths Overdue', '12+ Mths Overdue', 'Balance'];
var d = Highcharts.charts[0].series[0].data;
var d2 = newOrder.map(l=>d.find(v=>v.category===l)).filter(x=>x).map(d => ({name:d.name,y:d.y,color:d.color,borderColor:d.borderColor,dataLabels:d.y<0?{style:{color:"white"}}:void 0,isIntermediateSum:d.isIntermediateSum}));
Highcharts.charts[0].update({xAxis:{categories:newOrder}, series:[{name:"Value",data:d2}]}, true);

// Hide Risk Banner
document.querySelector(".footerisk").style.display = "none";

const formatter = Intl.NumberFormat(["en-GB"], { style: "currency", currency: "GBP" });

// Show total outstanding capital
const capitalRows = document.querySelectorAll('#capital_graph + section + section tr');
let overdueAmount = 0;
let inOverdue = false;
for (const el of capitalRows) {
    if (el.textContent?.trim() === "Overdue") {
        inOverdue = true;
    }
    if (inOverdue && el.children.length === 2) {
        const amount = parseFloat(el.children.item(1).textContent?.trim().substring(1).replace(",",""));
        overdueAmount += amount;
    }
}
const totalRow = capitalRows.item(capitalRows.length - 2);
const tr = document.createElement("tr");
tr.innerHTML = `<td colspan="2" class="text-right"><b>Total Overdue &nbsp;&nbsp; ${formatter.format(overdueAmount)}</b></td>`;
totalRow.parentElement?.insertBefore(tr, totalRow);

const totalActiveLoans = parseFloat(totalRow.textContent.replace(/[^\d.]/g, ""));

// Calculate Outstanding Interest
let lastMode = "";
let overdueCount = 0;
let activeCount = 0;
let overdueInterest = 0;
let outstandingInterest = 0;

const totalPortfolioValue = parseFloat(document.querySelector('.bg-white h4:nth-child(2)').textContent.trim().substring(1).replace(",",""));

const availableCashValue = parseFloat(document.querySelector('.bg-white:nth-child(3) h4:nth-child(2)').textContent.trim().substring(1).replace(",",""));

const pendingAmount = totalPortfolioValue - availableCashValue - totalActiveLoans;

const runningLoansAmount = totalActiveLoans - overdueAmount;

const interestDiv = document.createElement("div");
interestDiv.classList.add("material-card");
interestDiv.classList.add("mt-5");
interestDiv.innerHTML = `<table class="table table-borderless table-condensed" style="font-family: 'Gotham',serif">
<tbody>
    <tr class="border-bottom">
        <td colspan="2" style="font-size: 25px"><span style="font-weight: lighter">Interest -</span> <b>Adjusted</b></td>
    </tr>
    <tr>
        <td>Outstanding Interest</td>
        <td class="text-right" id="osi"></td>
    </tr>
    <tr>
        <td>Overdue Interest</td>
        <td class="text-right" id="odi"></td>
    </tr>
    <tr class="border-bottom">
        <td>Total Portfolio Value (Rightful)</td>
        <td class="text-right" id="tpvc"></td>
    </tr>
    </tbody></table>`;
const el = document.getElementById("loan-portfolio");
if (el) {
    el.parentElement?.insertBefore(interestDiv, el);
}
const overdueInterestP = document.getElementById("odi");
const outstandingInterestP = document.getElementById("osi");
const realPortfolioValueP = document.getElementById("tpvc");

const pieCard = document.createElement("div");
pieCard.classList.add("material-card");
pieCard.classList.add("mt-5");
pieCard.innerHTML = `<table class="table table-borderless table-condensed" style="font-family: 'Gotham',serif">
<tbody>
    <tr class="border-bottom">
        <td colspan="2" style="font-size: 25px"><span style="font-weight: lighter">Capital Breakdown</b></td>
    </tr>
    </tbody></table>`;
const pieDiv = document.createElement("div");
pieCard.appendChild(pieDiv);

interestDiv.parentElement?.insertBefore(pieCard, interestDiv);

Highcharts.setOptions({
    lang: {
        thousandsSep: ','
    }
});

Highcharts.chart(pieDiv, {
    chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
    },
    title: {
        text: ""
    },
    tooltip: {
        pointFormat: '{series.name}: <b>£{point.y:,.2f}</b>'
    },
    accessibility: {
        point: {
            valueSuffix: '%'
        }
    },
    plotOptions: {
        pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %'
            }
        }
    },
    series: [{
        name: 'Capital',
        colorByPoint: true,
        data: [{
            name: 'Pending',
            y: pendingAmount,
            color: {
                linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                stops: [
                    [0, "#152329"],
                    [1, "#3C5F7A"]
                ]
            }
        }, {
            name: 'Active (Due)',
            y: runningLoansAmount,
            color: {
                linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                stops: [
                    [0, '#38ef7d'],
                    [1, '#11998e']
                ]
            }
        },  {
            name: 'Active (Overdue)',
            y: overdueAmount,
            color: {
                linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                stops: [
                    [0, "#bd3654"],
                    [1, "#bd3676"]
                ]
            }
        }, {
            name: 'Cash',
            y: availableCashValue,
            color: {
                linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                stops: [
                    [0, "#152329"],
                    [1, "#3C5F7A"]
                ]
            }
        }]
    }]
});

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
                return `${a}<br/><span title="Contracted Duration">${formatDuration((e.loan_end_timestamp - e.loan_start_timestamp) * 1000)}</span>`;
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
                // interestPaid
                const v = parseFloat(a.substring(1));
                // expectedInterestAmount
                const w = parseFloat(e.expected_interest.substring(1));
                // pledgeSize
                const x = parseFloat(e.contribution.substring(1).replaceAll(",",""));
                // Fraction repaid
                const r = v / w;
                const pastEndDate = (e.loan_end_timestamp * 1000) < Date.now();
                const isDue  = (e.status !== "Paid Back") && pastEndDate;
                // daysOverdue
                const d = isDue ? (Date.now() - e.loan_end_timestamp * 1000) / 86400000 : 0;
                // penaltyInterestRate
                const i = parseFloat(e.interest_rate)/1000 + 0.02;
                const out = [a];
                if (v > 0) {
                    out.push(`<span title="Percentage Repaid">(${Math.round(r*100)}%)</span>`);
                }

                if (r < 1) {
                    // Optimistic estimation includeing 2% overdue bonus
                    const z = (1-r) * w + (x * d * i / 365);
                    out.push(`<span style="color:red" title="Outstanding (Expected)">${formatter.format(z)}`);

                    // Datatables filters all the rows then displays each row
                    // Wait for the switchover from filtering to displaying
                    // before starting to sum overdue interest
                    if (t === "display") {
                        if (lastMode === "filter") {
                            overdueCount = 0;
                            activeCount = 0;
                            overdueInterest = 0;
                            outstandingInterest = 0;
                        }
                        if (!pastEndDate || isDue) {
                            outstandingInterest += (w - v);
                            activeCount++;
                        }
                        if(isDue) {
                            overdueInterest += (w - v);
                            overdueCount++;
                        }

                        overdueInterestP.textContent = formatter.format(overdueInterest);
                        outstandingInterestP.textContent = formatter.format(outstandingInterest);
                        realPortfolioValueP.textContent = formatter.format(totalPortfolioValue + overdueInterest);
                    }
                }

                lastMode = t;

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