var app = angular.module("jeimes",[]);

app.directive("jeimesGrid",function(){
    return {
        restrict: "A",
        scope: {},
        link: function(scope,elem,attr){
            console.log(scope);
        }
    }
});