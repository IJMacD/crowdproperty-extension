// Re-order chart categories
var newOrder = ['Active Loans', 'Available', 'Pledged', 'Not Started', 'Account', 'Balance', 'Due', '<1 Mth', '1-3 Mths', '3-6 Mths', '6-12 Mths', '12+ Mths'];
var d = Highcharts.charts[0].series[0].data;
var d2 = newOrder.map(l=>d.find(v=>v.category===l)).filter(x=>x).map(d => ({name:d.name,y:d.y,color:d.color,borderColor:d.borderColor,dataLabels:d.y<0?{style:{color:"white"}}:void 0,isIntermediateSum:d.isIntermediateSum}));
Highcharts.charts[0].update({xAxis:{categories:newOrder}, series:[{name:"Value",data:d2}]}, true);