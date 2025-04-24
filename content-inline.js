// Add sankey module needed later
const s = document.createElement("script");
s.src = "https://unpkg.com/highcharts@9.1.2/modules/sankey.js";
document.head.append(s);

/*
 * ******************************
 * Current Portfolio & Payback
 * ******************************/

/**
 * @param {() => void} fn
 */
function waitForHighcharts(fn) {
  try {
    fn();
  } catch (e) {
    console.debug("Chart not ready for re-drawing. Retrying in 5 sec");
    setTimeout(() => {
      try {
        fn();
      } catch (e) {
        console.debug("Chart not ready for re-drawing. Retrying after 10 sec");
        setTimeout(() => fn(), 5000);
      }
    }, 5000);
  }
}
//#region Current Portfolio & Payback

// Re-order chart categories
function reorderCapitalChart() {
  const capitalChartContainer = document.querySelector(
    "#capital_graph .highcharts-container"
  );

  if (!capitalChartContainer) {
    throw Error("Highcharts not ready");
  }

  const chart = Highcharts.charts.find(
    (chart) => chart.container === capitalChartContainer
  );

  if (!chart) {
    throw Error("Highcharts not ready");
  }

  var newOrder = [
    "Available",
    "Pledged",
    "Not Started",
    "Active Loans",
    "Account",
    "12+ Mths",
    "6-12 Mths",
    "3-6 Mths",
    "0-3 Mths",
    "0-3 Mths Overdue",
    "3-6 Mths Overdue",
    "6-12 Mths Overdue",
    "12+ Mths Overdue",
    "Balance",
  ];
  var d = chart.series[0].data;
  const overdueColour = {
    linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
    stops: [
      [0, "#bd3654"],
      [1, "#bd3676"],
    ],
  };
  var d2 = newOrder
    .map((l) => d.find((v) => v.category === l))
    .filter((x) => x)
    .map(
      (
        /** @type {import("highcharts").Point&{borderColor:String,isIntermediateSum:Boolean}} */ d
      ) => {
        const color =
          typeof d.category === "string" && d.category.includes("Overdue")
            ? overdueColour
            : d.color;
        const dataLabelsColour =
          d.y < 0 && d.category != "Balance"
            ? { style: { color: "white" } }
            : void 0;

        return {
          name: d.name,
          y: d.y,
          color,
          borderColor: d.borderColor,
          dataLabels: dataLabelsColour,
          isIntermediateSum: d.isIntermediateSum,
        };
      }
    );
  chart.update(
    {
      xAxis: { categories: newOrder },
      series: [
        {
          name: "Value",
          data: d2,
          type: undefined,
        },
      ],
    },
    true
  );
}

waitForHighcharts(reorderCapitalChart);
//#endregion

//#region Risk Banner
// Hide Risk Banner
/** @type {HTMLElement} */
const riskBanner = document.querySelector(".footerisk");
riskBanner.style.display = "none";
//#endregion

const formatter = Intl.NumberFormat(["en-GB"], {
  style: "currency",
  currency: "GBP",
});

const totalPortfolioValue = parseMoney(
  document.querySelector(".bg-white h4:nth-child(2)").textContent
);

const availableCashValue = parseMoney(
  document.querySelector(".bg-white:nth-child(3) h4:nth-child(2)").textContent
);

const accountCash = parseMoney(
  document
    .getElementById("capital_graph")
    .nextElementSibling.querySelector("td:nth-child(2)").textContent
);

const pledgedAmount = parseMoney(
  document
    .getElementById("capital_graph")
    .nextElementSibling.querySelector("tr:nth-child(3) td:nth-child(2)")
    .textContent
);

/************************
 * Overview - History
 ************************/
//#region Overview - History

// Highlight interest cell
const overviewCard = document.querySelectorAll(".material-card")[1];
/** @type {HTMLElement} */
const interestCell = overviewCard.querySelector(
  "tr:nth-child(4) td:nth-child(2)"
);
interestCell.style.cssText =
  "font-weight: bolder; color: darkgreen; font-size: 1.1em;";

// Show losses/net gains
const totalLent = parseMoney(
  overviewCard.querySelector("tr:nth-child(2) td:nth-child(2)").textContent
);
const totalPaidBack = parseMoney(
  overviewCard.querySelector("tr:nth-child(3) td:nth-child(2)").textContent
);
const totalInterest = parseMoney(
  overviewCard.querySelector("tr:nth-child(4) td:nth-child(2)").textContent
);
const totalActive = parseMoney(
  overviewCard.querySelector("tr:nth-child(5) td:nth-child(2)").textContent
);

const totalLosses = totalLent - (totalActive + pledgedAmount) - totalPaidBack;
const netGains = totalInterest - totalLosses;
const netDeposits =
  totalLent -
  (totalActive + pledgedAmount) -
  totalPaidBack +
  totalPortfolioValue -
  totalInterest;

const lossesRow = document.createElement("tr");
lossesRow.innerHTML = `<td>Total Losses</td>
<td class="text-right" style="font-weight: bolder; color: Crimson; font-size: 1.1em;">${formatter.format(
  totalLosses
)}</td>`;

overviewCard.querySelector("tbody").append(lossesRow);
const netRow = document.createElement("tr");
netRow.innerHTML = `<td>Net Gains</td>
<td class="text-right" style="font-weight: bolder; font-size: 1.1em;">${formatter.format(
  netGains
)}</td>`;
overviewCard.querySelector("tbody").append(netRow);

const netDepositsRow = document.createElement("tr");
netDepositsRow.innerHTML = `<td>Net Deposits</td>
<td class="text-right"">${formatter.format(netDeposits)}</td>`;
overviewCard
  .querySelector("tbody")
  .insertBefore(netDepositsRow, overviewCard.querySelector("tr:nth-child(2)"));

const netDepositsKey = document.createElement("p");
netDepositsKey.className = "small px-4 mt-2";
netDepositsKey.innerHTML = `<strong>Net Deposits</strong> - Calculated as: Total Deposits &minus; Total Withdrawals`;
overviewCard.parentElement.append(netDepositsKey);
//#endregion

//#region Portfolio Performance
function addLossesToPerformanceChart() {
  const portfolioPerformanceChartContainer = document.querySelector(
    "#repayment-graph .highcharts-container"
  );

  const chart = Highcharts.charts.find(
    (chart) => chart.container === portfolioPerformanceChartContainer
  );

  if (!chart) {
    throw Error("Highcharts not ready");
  }

  // Recreate chart using data we already have
  chart.update(
    {
      xAxis: {
        categories: [
          "Total Lent",
          "Total Paid Back",
          "Total Active",
          "Total Losses",
        ],
        labels: {},
      },
      series: [
        {
          name: "Total Lent",
          type: "waterfall",
          data: [totalLent, null, null, null],
          color: {
            linearGradient: {
              x1: 0,
              x2: 0,
              y1: 0,
              y2: 1,
            },
            stops: [
              [0, "#294064"],
              [1, "#0C1C36"],
            ],
          },
          borderColor: null,
        },
        {
          type: "waterfall",
          data: [null, -totalInterest, null, null],
          showInLegend: !1,
          color: "transparent",
          borderColor: null,
          borderWidth: 0,
          dataLabels: {
            enabled: !1,
          },
          enableMouseTracking: !1,
        },
        {
          name: "Total Capital Paid Back",
          type: "waterfall",
          data: [null, -totalPaidBack, null, null],
          color: {
            linearGradient: {
              x1: 0,
              x2: 0,
              y1: 0,
              y2: 1,
            },
            stops: [
              [0, "#FE237F"],
              [1, "#fd5c9d"],
            ],
          },
          borderColor: null,
        },
        {
          name: "Total Interest Paid Back",
          type: "waterfall",
          data: [null, totalInterest, null, null],
          color: {
            linearGradient: {
              x1: 0,
              x2: 0,
              y1: 0,
              y2: 1,
            },
            stops: [
              [0, "#fb78b3"],
              [1, "#ff98c1"],
            ],
          },
          borderColor: null,
        },
        {
          name: "Loans Pending Start",
          type: "waterfall",
          data: [null, null, -pendingAmount, null],
          color: {
            linearGradient: {
              x1: 0,
              x2: 0,
              y1: 0,
              y2: 1,
            },
            stops: [
              [0, "#00b13f"],
              [1, "#00ff52"],
            ],
          },
          borderColor: null,
        },
        {
          name: "Total Active",
          type: "waterfall",
          data: [null, null, -totalActive + pendingAmount, null],
          color: {
            linearGradient: {
              x1: 0,
              x2: 0,
              y1: 0,
              y2: 1,
            },
            stops: [
              [0, "#2EBE64"],
              [1, "#89F4B1"],
            ],
          },
          borderColor: null,
        },
        {
          name: "Total Losses",
          type: "waterfall",
          data: [null, null, null, -totalLosses],
          color: {
            linearGradient: {
              x1: 0,
              x2: 0,
              y1: 0,
              y2: 1,
            },
            stops: [
              [0, "#294064"],
              [1, "#0C1C36"],
            ],
          },
          borderColor: null,
        },
      ],
    },
    true,
    true
  );
}
waitForHighcharts(addLossesToPerformanceChart);

//#endregion

/***************************
 * Overview - Payback*
 ***************************/
//#region Overview - Payback*
// Show total outstanding capital
const capitalRows = document.querySelectorAll(
  "#capital_graph + section + section tr"
);
let overdueAmount = 0;
let inOverdue = false;
for (const el of capitalRows) {
  if (el.textContent?.trim() === "Overdue") {
    inOverdue = true;
  }
  if (inOverdue && el.children.length === 2) {
    const amount = parseFloat(
      el.children.item(1).textContent?.trim().substring(1).replace(",", "")
    );
    overdueAmount += amount;
  }
}
const totalRow = capitalRows.item(capitalRows.length - 2);
const tr = document.createElement("tr");
tr.innerHTML = `<td colspan="2" class="text-right"><b>Total Overdue &nbsp;&nbsp; ${formatter.format(
  overdueAmount
)}</b></td>`;
totalRow.parentElement?.insertBefore(tr, totalRow);

const totalActiveLoans = parseMoney(totalRow.textContent);

/**
 * @param {string} text
 */
function parseMoney(text) {
  return parseFloat(text.replace(/[^-\d.]/g, ""));
}
//#endregion

/*********************
 * Interest - Adjusted
 *********************/
//#region Interest - Adjusted

// Calculate Outstanding Interest
let lastMode = "";
let overdueCount = 0;
let activeCount = 0;
let overdueInterest = 0;
let outstandingInterest = 0;

const pendingAmount =
  totalPortfolioValue - availableCashValue - totalActiveLoans;

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
                <td>Estimated Interest Due</td>
                <td class="text-right" id="osi"></td>
        </tr>
        <tr>
                <td>Estimated Interest Overdue</td>
                <td class="text-right" id="odi"></td>
        </tr>
        <tr class="border-bottom">
                <td>(Rightful) Portfolio Value</td>
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
//#endregion

/********************
 * Capital Breakdown
 ********************/
//#region Capital Breakdown

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
    thousandsSep: ",",
  },
});

window.addEventListener("load", () => showPie());

function showPie() {
  Highcharts.chart(pieDiv, {
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false,
      type: "pie",
    },
    title: {
      text: "",
    },
    tooltip: {
      pointFormat: "{series.name}: <b>£{point.y:,.2f}</b>",
    },
    accessibility: {
      point: {
        valueSuffix: "%",
      },
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.percentage:.1f} %",
        },
      },
    },
    series: [
      {
        name: "Capital",
        type: undefined,
        colorByPoint: true,
        data: [
          {
            name: "Pending",
            y: pendingAmount,
            color: {
              linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
              stops: [
                [0, "#152329"],
                [1, "#3C5F7A"],
              ],
            },
          },
          {
            name: "Active (Due)",
            y: runningLoansAmount,
            color: {
              linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
              stops: [
                [0, "#38ef7d"],
                [1, "#11998e"],
              ],
            },
          },
          {
            name: "Active (Overdue)",
            y: overdueAmount,
            color: {
              linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
              stops: [
                [0, "#bd3654"],
                [1, "#bd3676"],
              ],
            },
          },
          {
            name: "Cash",
            y: availableCashValue,
            color: {
              linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
              stops: [
                [0, "#152329"],
                [1, "#3C5F7A"],
              ],
            },
          },
        ],
      },
    ],
  });
}
//#endregion

/*******************
 * Loan Portfolio
 *******************/
//#region Loan Portfolio

// Re-define dataTables function
/** @this {{project: string, loan: string}} */
window.loadDatatable = function (a) {
  var t,
    e = $("#".concat(a, ".datatable-sort")),
    d = "/datatables/pledges/" + a,
    l = this.project,
    s = this.loan;
  e.length &&
    ((t = e.data("walletIds").length ? e.data("walletIds") : []),
    e.dataTable({
      ajax: {
        url: d,
        type: "GET",
        dataSrc: "Data",
        data: {
          walletIds: t,
        },
      },
      columns: [
        {
          data: "project",
          render: function (a, t, e) {
            return (
              "<a href=" +
              (e.id
                ? l.replace(":id", e.id)
                : s
                    .replace(":loanId", e.loanId)
                    .replace(":pledgeId", e.pledgeId)) +
              " class='text-dark'>" +
              a +
              "</a>"
            );
          },
        },
        {
          data: "pledge_type",
        },
        {
          data: "contribution",
        },
        {
          data: "interest_rate",
          render: function (a, t, e) {
            return `${a}<br/><span title="Contracted Duration">${formatDuration(
              (e.loan_end_timestamp - e.loan_start_timestamp) * 1000
            )}</span>`;
          },
        },
        {
          // @ts-ignore
          data: {
            display: "loan_start_display",
            sort: "loan_start_timestamp",
          },
          render: function (a, t, e) {
            return formatDate(new Date(e.loan_start_timestamp * 1000));
          },
        },
        {
          // @ts-ignore
          data: {
            display: "loan_end_display",
            sort: "loan_end_timestamp",
          },
          render: function (a, t, e) {
            const isDue =
              e.status !== "Paid Back" &&
              e.loan_end_timestamp * 1000 < Date.now();
            const style = isDue ? "color: red;" : "";
            return `<span style="${style}">${formatDate(
              new Date(e.loan_end_timestamp * 1000)
            )}</span>`;
          },
        },
        {
          data: "status",
          render: function (a, t, e) {
            const isDue =
              e.status !== "Paid Back" &&
              e.loan_end_timestamp * 1000 < Date.now();
            return isDue
              ? `Due<br/>(${formatDuration(
                  Date.now() - e.loan_end_timestamp * 1000
                )} ago)`
              : a;
          },
        },
        {
          data: "expected_interest",
        },
        {
          data: "interest_paid",
          render: function (a, t, e) {
            // interestPaid
            const v = parseFloat(a.substring(1));
            // expectedInterestAmount
            const w = parseFloat(e.expected_interest.substring(1));
            // pledgeSize
            const x = parseFloat(
              e.contribution.substring(1).replaceAll(",", "")
            );
            // Fraction repaid
            const r = v / w;
            const pastEndDate = e.loan_end_timestamp * 1000 < Date.now();
            const isDue = e.status !== "Paid Back" && pastEndDate;
            // daysOverdue
            const d = isDue
              ? (Date.now() - e.loan_end_timestamp * 1000) / 86400000
              : 0;
            // penaltyInterestRate
            const i = parseFloat(e.interest_rate) / 1000 + 0.02;
            const out = [a];
            if (v > 0) {
              out.push(
                `<span title="Percentage Repaid">(${Math.round(
                  r * 100
                )}%)</span>`
              );
            }

            if (r < 1) {
              // Optimistic estimation including 2% overdue bonus
              const z = (1 - r) * w + (x * d * i) / 365;
              out.push(
                `<span style="color:red" title="Outstanding (Expected)">${formatter.format(
                  z
                )}`
              );

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
                  outstandingInterest += w - v;
                  activeCount++;
                }
                if (isDue) {
                  overdueInterest += w - v;
                  overdueCount++;
                }

                overdueInterestP.textContent =
                  formatter.format(overdueInterest);
                outstandingInterestP.textContent = formatter.format(
                  outstandingInterest - overdueInterest
                );
                realPortfolioValueP.textContent = formatter.format(
                  totalPortfolioValue + overdueInterest
                );
              }
            }

            lastMode = t;

            return out.join("<br/>");
          },
        },
        {
          data: "received",
        },
      ],
      createdRow: function (a, t, e) {
        $(a).addClass("small"), $(a).addClass("text-center");
      },
      bDestroy: true,
    }),
    e.width("100%"));
};

// Re-load table details
const pledgeTypes = ["started", "completed", "not-started", "not-received"];
const urls = {
  project: "https://www.crowdproperty.com/projects/:id",
  loan: "https://www.crowdproperty.com/account/loans/:loanId/pledge/:pledgeId",
};
pledgeTypes.forEach(window.loadDatatable, urls);

/**
 * @param {number} delta
 */
function formatDuration(delta) {
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
  let m = Math.round((delta - n * ONE_YEAR) / ONE_MONTH);
  if (m === 12) {
    n++;
    m = 0;
  }
  return `${n === 1 ? "1 Year" : `${n} Years`} ${
    m === 0 ? "" : m === 1 ? "1 Month" : `${m} Months`
  }`;
}

/**
 * @param {Date} d
 */
function formatDate(d) {
  return d.toISOString().substring(0, 10).replace(/-/g, "\u2011");
}
//#endregion

/***************
 * Capital Flow
 ***************/
//#region Capital Flow

// Add Sankey card and styles
const sankeyCard = document.createElement("div");
sankeyCard.className = "material-card mt-5";
sankeyCard.innerHTML = `<table class="table table-borderless table-condensed" style="font-family: 'Gotham',serif">
<tbody>
  <tr class="border-bottom">
    <td colspan="2" style="font-size: 25px"><span style="font-weight: lighter">Capital Flow</b></td>
  </tr>
</tbody></table>
<div id="sankey"></div>
<p style="text-align:right;margin-top: 1rem;">
  <button onclick="updateSankey()" class="btn btn-sm btn-gradient-blue">Update</button>
</p>`;
const lp = document.getElementById("loan-portfolio");
lp?.parentElement?.insertBefore(sankeyCard, lp);
const sankeyDiv = document.getElementById("sankey");

// Need to flip chart and un-flip labels
const sankeyStyle = document.createElement("style");
sankeyStyle.innerHTML = `
#sankey g.highcharts-series.highcharts-series-0.highcharts-sankey-series.highcharts-tracker {
  transform: translate(99%, 50px) scale(-1, 1);
}

#sankey g.highcharts-data-labels.highcharts-series-0.highcharts-sankey-series.highcharts-tracker {
  transform: translate(99%, 50px) scale(-1, 1);
}

#sankey g.highcharts-label.highcharts-data-label text {
  transform: translate(80px, 0px) scale(-1, 1);
}`;
document.body.append(sankeyStyle);

/** @type {import("highcharts").GradientColorObject} */
const greyGradient = {
  linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
  stops: [
    [0, "#152329"],
    [1, "#3C5F7A"],
  ],
};
/** @type {import("highcharts").GradientColorObject} */
const greenGradient = {
  linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
  stops: [
    [0, "#38ef7d"],
    [1, "#11998e"],
  ],
};
/** @type {import("highcharts").GradientColorObject} */
const redGradient = {
  linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
  stops: [
    [0, "#bd3654"],
    [1, "#bd3676"],
  ],
};

function updateSankey() {
  fetch(
    "https://investor.crowdproperty.com/account/portfolio/all/transactions-export/all"
  )
    .then((r) => r.text())
    .then((csv) => {
      localStorage.setItem("transactions", csv);

      showSankey();
    });

  sankeyDiv.innerHTML = `<p style="font-style:italic">Loading...</p>`;
}

showSankey();

function showSankey() {
  const CSV_DATA = localStorage.getItem("transactions");

  import("./csvdb.min.js").then((module) => {
    const db = new module.CSVDB(CSV_DATA);

    const year = (row) => new Date(row.Date).getFullYear();

    const deposits = db
      .query()
      .where((row) => row.From === "Deposit")
      .groupBy(year)
      .select({ year, amount: "SUM(Transaction)" })
      .toArray()
      .reverse();

    const withdrawals = db
      .query()
      .where((row) => row.To.startsWith("Withdrawal"))
      .groupBy(year)
      .select({ year, amount: "SUM(Transaction)" })
      .toArray()
      .reverse();

    const interest = db
      .query()
      .where((row) => row.Type.startsWith("Interest"))
      .groupBy(year)
      .select({ year, amount: "SUM(Transaction)" })
      .toArray()
      .reverse();

    const data = [];
    let currentBalance = 0;

    const withdrawalNodes = [];
    const withdrawalGhosts = [];

    for (let i = 0; i < deposits.length; i++) {
      const year = deposits[i].year;

      const isCurrentBalance = i === deposits.length - 1;

      const target = isCurrentBalance
        ? "Current Balance"
        : `${year + 1} Opening Balance`;

      const withdrawalsThisYear =
        -withdrawals.find((w) => w.year === year)?.amount || 0;

      // Note: The whole algorithm assumes deposits every year
      const netDepositsThisYear = deposits[i].amount - withdrawalsThisYear;

      if (i > 0) {
        let transferredForward =
          netDepositsThisYear < 0
            ? currentBalance + netDepositsThisYear
            : currentBalance;

        // Include all losses in current balance because we don't have any data
        // to be able to break down by year.
        if (totalLosses > 0 && isCurrentBalance) {
          transferredForward -= totalLosses;

          data.push([
            `${year} Opening Balance`,
            `Losses`,
            totalLosses,
            redGradient,
          ]);
        }

        data.push([
          `${year} Opening Balance`,
          target,
          transferredForward,
          greenGradient,
        ]);
      }

      currentBalance += netDepositsThisYear + interest[i].amount;

      const d = `${year} Deposit`;
      const w = `${year} Withdrawal`;

      if (netDepositsThisYear < 0) {
        // Withdrew more than deposited
        // ============================
        // There will be an edge coming from the previous year's balance into
        // the withdrawal node.
        // All deposits from the year go straight into the withdrawal node.

        data.push([
          `${year} Opening Balance`,
          w,
          -netDepositsThisYear,
          greyGradient,
        ]);

        data.push([d, w, deposits[i].amount, greyGradient]);

        withdrawalNodes.push(w);
      } else if (netDepositsThisYear > 0) {
        // Deposited more than withdrew
        // ============================
        // The net amount deposited goes from the deposit node into the next
        // year's balance.
        // If there are any withdrawals the delta between net and total deposits
        // is the size of the edge from the deposit node into the withdrawal
        // node.

        data.push([d, target, netDepositsThisYear, greyGradient]);

        if (withdrawalsThisYear > 0) {
          data.push([d, w, withdrawalsThisYear, greyGradient]);

          withdrawalNodes.push(w);
        }
      }

      data.push([`${year} Interest`, target, interest[i].amount, redGradient]);

      // In order to align the data ranks, we need to fill in dummy points.
      for (let i = 0; i < withdrawalGhosts.length; i++) {
        const ghost = withdrawalGhosts[i];
        withdrawalGhosts[i] += "'";
        const nextGhost = withdrawalGhosts[i];
        data.push([ghost, nextGhost, 0]);
      }

      if (withdrawalsThisYear > 0) {
        withdrawalGhosts.push(w);
      }
    }

    const nodeIDs = new Set([
      ...data.map((d) => d[0]),
      "Current Balance",
      ...withdrawalNodes,
    ]);

    if (totalLosses > 0) {
      nodeIDs.add("Losses");
    }

    function draw() {
      Highcharts.chart(
        sankeyDiv,
        {
          chart: {
            inverted: false,
            // @ts-ignore
            centerInCategory: true,
          },
          title: {
            text: "Capital Flow",
          },
          accessibility: {
            point: {
              valueDescriptionFormat:
                "{index}. {point.from} to {point.to}, £{point.weight:,.2f}.",
            },
          },
          series: [
            {
              colorByPoint: true,
              // Note to/from are reversed
              keys: ["to", "from", "weight", "color"],
              data,
              type: "sankey",
              name: "Capital",
              nodes: [...nodeIDs].map((id) => ({ color: greenGradient, id })),
            },
          ],
          tooltip: {
            // @ts-ignore
            nodeFormat: "£{point.sum:,.2f}.",
            pointFormat: "{point.to} → {point.from} £{point.weight:,.2f}.",
          },
        },
        null
      );
    }

    try {
      draw();
    } catch (e) {
      console.debug("Sankey module not ready. Retrying");
      setTimeout(() => draw(), 5000);
    }
  });
}
//#endregion
