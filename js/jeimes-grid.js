var app = angular.module("jeimes",[]);

app.directive("jeimesGrid",function(){
    return {
        require: 'ngModel',
			restrict: 'A',
			scope: {
				columns: '=',
				criteria: '=',
				gridmodel: '=',
				gettype: '=',
				gridid: '=',
                factory: "=",
                method: "=",
				model: '=',
				datamodel: '=',
				mainmodel: "=",
                columnsInside: "=",
				att: '=',
                hierarchical: "=",
                hierarchicalModel: "=",
                checkbox: "="
			},
			link: function($scope, $element, attrs) {
				var columns = angular.copy($scope.columns);
				var columnsInside = $scope.columnsInside;
                var criterios = angular.copy($scope.criteria);
                var methodMainGrid = $scope.method;
                var factoryMainGrid = eval($scope.factory);
                var checkbox = angular.copy($scope.checkbox);

				if(typeof $scope.hierarchical !== 'undefined' || $scope.hierarchical === true) {
                    var hierarchical = angular.copy($scope.hierarchical);
                    var criteriosHierarchical = angular.copy($scope.hierarchicalModel);
                }

				// Watchs para atualização da grid quando o critério de busca ou uma atualização for feita 				
				$scope.$watch('criteria', function(newValue, oldValue) {
					if(_.isEqual(oldValue, newValue) === false) {
						criterios = angular.copy(newValue);
						createGrid();
					}
				}, true);

				$scope.$watch('att', function(newValue, oldValue) {
					if(_.isEqual(oldValue, newValue) === false) {
						createGrid();
					}
				}, true);

				if(checkbox === false) {
					columns = removeCheckboxColumn(columns);
				}

				// Função que dispara a criação da grid e cria as funções para utilização dos botõe da grid
				$.getScript($window.location.origin+"/js/kendo.culture.pt-BR.min.js", function () {
					createGrid();
					var grid = $("#" + $scope.gridid).data("kendoGrid");

					grid.table.on("click", ".checkbox", selectRow);
                    grid.table.on("click", ".radio", selectRow);

					//Função que dispara a ação dos botões da grid, essa função chama uma função do scope pai da diretiva
					grid.table.on("click", ".k-action", function (e) {
						var extraData = $(e.target).data('extra');
						var row = $(e.target).closest("tr");
						var grid = $("#" + $scope.gridid).data("kendoGrid");
						var dataItem = grid.dataItem(row);

                        $scope.$emit('extraAction', {'id': dataItem.id, 'extraData': extraData, 'status': criterios.Criteria.status, 'dataItem': dataItem});
					});

					//Função que dispara a ação dos checkbox dentro da grid, essa função chama uma função do scope pai da diretiva
					function selectRow() {
						var checked = this.checked,
							row = $(this).closest("tr"),
							grid = $("#"+$scope.gridid).data("kendoGrid"),
							dataItem = grid.dataItem(row),
                            special = false;

						if(criterios.Criteria.specialGrid){
                            special = true;
                        }
						$scope.$parent.$parent.$parent.buildItensToSend(dataItem, checked, criterios.Criteria.status, special);
						if (checked) {
							//-select the row
							row.addClass("k-state-selected");
						} else {
							//-remove selection
							row.removeClass("k-state-selected");
						}
					}
				});

				//Funçao que cria a grid a partir dos parametros passados para a diretiva
				function createGrid() {
                    if( $("#"+$scope.gridid).data("kendoGrid")) {
                        $("#"+$scope.gridid).data("kendoGrid").destroy();
                    }
					$("#"+$scope.gridid).kendoGrid({
						columns: columns,
						dataSource: {
							transport: {
								read: function(options){
                                    if(typeof $scope.mainmodel != 'undefined') {
                                       $scope.$parent.$parent.$parent[$scope.mainmodel].isLoading[$scope.gridid] = true;
                                    }
                                    factoryMainGrid[methodMainGrid]({params: criterios.Criteria}).then(function successCallback(response) {
                                        if(typeof $scope.mainmodel != 'undefined') {
                                            $scope.$parent.$parent.$parent[$scope.mainmodel].isLoading[$scope.gridid] = false;
                                        }
                                        options.success(response);
                                    }, function errorCallback(response) {

                                    });
								}
							},
							schema: {
								data: function(response){
									return response;
								},
								model: $scope.gridmodel,
								total: function(response) {
                                    $scope.$parent.$parent.$parent[$scope.mainmodel].countItens[$scope.gridid] = response.length;
									return response.length;
								}
							}
						},
                        detailInit: detailInit,
                        dataBound: function(e){

                            // Verificação para validar se a grid será hierarquica ou não, se não for remove a coluna que permite a expansão da grid
                            if(typeof hierarchical == 'undefined' || typeof hierarchical == false){
                                this.wrapper.find(".k-hierarchy-col").remove();//remove col elements for hierarchy column
                                this.wrapper.find(".k-hierarchy-cell").hide();//remove cell elements for hierarchy column
                            }

                            // Função que faz com que o scroll bar apareça mesmo quando não há itens na grid
                            if (e.sender.dataSource.view().length == 0) {
                                var colspan = e.sender.thead.find("th").length;
                                var emptyRow = "<tr><td colspan='" + colspan + "'></td></tr>";
                                e.sender.tbody.html(emptyRow);
                                e.sender.table.width(800);
                            }
                        },
						reorderable: true,
						resizable: true,
                        selectable: "multiple",
						filterable: {
							mode: "row",
							operators: {
								string: {
									eq: "É igual a",
									startswith: "Começa com",
									contains: "Contem",
									neq: "Não é igual a",
									endswith: "Termina com"
								}
							}
						},
						sortable: true,
						columnMenu: true,
                        sort: onSorting,
                        filter: onFiltering,
                        page: onPaging,
						pageable: {
							pageSize: 20,
							refresh: true,
							pageSizes: true,
							buttonCount: 5
						}
					});
				}

                function detailInit(e) {
                    var dataToGrid = e.data[criteriosHierarchical.paramObject];
				    $("<div/>").appendTo(e.detailCell).kendoGrid({
                       dataSource: {
                           transport: {
                               read: function (options) {
                                   options.success(dataToGrid);
                               }
                           },
                           schema: {
                               data: function (response) {
                                   return response;
                               },
                               total: function (response) {
                                   return response.length;
                               }
                           }
                       },
                       scrollable: true,
                       sortable: true,
                       pageable: {
                           pageSize: 20,
                           refresh: true,
                           pageSizes: true,
                           buttonCount: 5
                       },
                       columns: columnsInside
                   });
                }

				function removeCheckboxColumn(columnsChanged) {
                    if(columnsChanged[0].template === '<input type=\'checkbox\' class=\'checkbox\' />'){
                        columnsChanged.splice(0, 1);
                    }
                    return columnsChanged;
				}

                function onSorting(arg) {
                    console.log("Sorting on field: " + arg.sort.field + ", direction:" + (arg.sort.dir || "none"));
                }

                function onFiltering(arg) {
                    console.log("Filter on " + kendo.stringify(arg.filter));
                }

                function onPaging(arg) {
                    console.log("Paging to page index:" + arg.page);
                }
			}
    }
});
