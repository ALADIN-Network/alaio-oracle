var stats = require("stats-lite")

function aggregate(data, aggregation_type, string_to_count) {
    console.log("data in aggregation", data)
    console.log("aggregation_type ", aggregation_type)
    var sum = 0;
    var  normal_data = 0;
    var sum_of_squares = 0.0;
    var len = data.length;
    var new_mean, counter = 0;

    if (aggregation_type == 0 ) {
        for (i = 0; i<len; i++) {
            sum += data[i];
        }
        return (sum/data.length)
    }

    else if(aggregation_type == 1){

        for (i = 0; i<len; i++) {

            if(typeof data[i] === 'number'){
                
                sum += data[i];
                console.log("Math.pow(data[i],2)", Math.pow(data[i],2))
                var square =  Math.pow(data[i],2);
                sum_of_squares += square;
                console.log("sum of squares", sum_of_squares)

            }
            
        }   
        console.log("sum ", sum, "len ", len)
        var mean = sum/len;
        console.log("mean", mean)
        // variance = sum_of_squares/len;
        variance = stats.variance(data)
        console.log("variance", variance)
        var sd = stats.stdev(data)
        console.log("sd", sd)
        console.log("normal values are between :", mean+sd, "and ",mean-sd)
        for (i = 0; i<len; i++) {
            if(typeof data[i] === 'number'){
                if((data[i] < (mean + sd)) && (data[i] > (mean - sd))){
                    console.log("normal data : ", data[i])
                    normal_data += data[i];
                    counter += 1;
                }
                else continue;
            }
            else continue;
        }  
        return new_mean = normal_data / counter;
    }

    else if (aggregation_type == 2 ){
        // var data = ["success","failure","yes","no","0","1","positive","negetive","unsuccessfull","true","false"];
        var positive_responses = ["success","yes","1","positive","true"];
        var negetive_responses = ["failure","no","0","negetive","unsuccessfull","false"];
        bool_data = [];
        for(var i=0;i<data.length;i++)
        {
            if(positive_responses.indexOf(data[i]) !== -1)
            {
                bool_data.push(true);
            }
            if(negetive_responses.indexOf(data[i]) !== -1)
            {
                bool_data.push(false);
            }
        }
        console.log(bool_data);
        var set = new Set(bool_data);
        var arr = Array.from(set);
        count_a = 0;
        count_b = 0;
        for(var i=0;i<bool_data.length;i++)
        {
            if(bool_data[i]==arr[0])
            {
                count_a+=1; // 0
            }else{
                count_b+=1; // 1
            }
        }
        if(count_a===count_b)
        {
            console.log("Equal Positive and Negative responses, returning :", arr[1])
            return 0;
        }else if(count_a>count_b)
        {
            console.log("Unequal Positive and Negative responses")
            return arr[0];
        }else{
            console.log("Unequal Positive and Negative Responses")
            return arr[1];
        }

    }
    else if (aggregation_type == 3 ){
        return Math.max(...data);
    }
    else if (aggregation_type == 4 ){
        return Math.min(...data);
    }
    else if (aggregation_type == 5 ){
        for (i = 0; i<len; i++) {
            sum += data[i];
        }
        return sum;
    }
    else if (aggregation_type == 6 ){
        return data[0];
    }
    else if (aggregation_type == 7 ){
        return data[len-1];
    }
    else if (aggregation_type == 8 ){

        return stats.median(data);
        
    }
    else if (aggregation_type == 9 ){
        console.log("handata ",data);
        var modes = [], count = [], i, number, maxIndex = 0;
 
        for (i = 0; i < data.length; i += 1) {
            number = data[i];
            count[number] = (count[number] || 0) + 1;
            if (count[number] > maxIndex) {
                maxIndex = count[number];
            }
        }
     
        for (i in count)
            if (count.hasOwnProperty(i)) {
                if (count[i] === maxIndex) {
                    modes.push(Number(i));
                }
            }
        console.log("mode arr: ",modes);
        return modes[0];
    }
    else if (aggregation_type == 10 ){
        console.log("string data: ",data);
        var count = 0;
        for(var i=0;i<data.length;i++)
        {
            if(data[i]==string_to_count)
            {
                count+=1;
            }
        }
        console.log("string count is: ",count);
        return count;
    }

    else return null
}

// function mean (data, aggregation_type, string_to_count){

// }
// function sd (data, aggregation_type, string_to_count){
    
// }
// function boolean (data, aggregation_type, string_to_count){
    
// }
// function sum (data, aggregation_type, string_to_count){
    
// }
// function mode (data, aggregation_type, string_to_count){
    
// }
// function count (data, aggregation_type, string_to_count){
    
// }
module.exports = aggregate;