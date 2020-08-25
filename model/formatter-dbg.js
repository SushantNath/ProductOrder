/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/model/odata/type/Time",
		"sap/ui/core/format/DateFormat",
		"sap/ui/model/Filter"
	],

	function(Time, DateFormat, Filter) {
		"use strict";

		return {

			/**
			 * Rounds the number unit value to 2 digits
			 * @public
			 * @param {string} sValue the number string to be rounded
			 * @returns {string} sValue with 2 digits rounded
			 */
			numberUnit: function(sValue) {
				if (!sValue) {
					return "";
				}
				return parseFloat(sValue).toFixed(2);
			},

			setHoldIconVisibility: function(MfgFeatureIsActiveInAnyPlant) {
				if (MfgFeatureIsActiveInAnyPlant === "X" || MfgFeatureIsActiveInAnyPlant === true) {
					return true;
				} else {
					return false;
				}

			},

			// /*
			//  * Calculate the percenatge value
			//  * @param {string} ConfirmedYieldQty
			//  * @param {string} PlannedTotalQty
			//  * @returns {string} which gives the percentage.
			//  */
			// percentValue: function(ConfirmedYieldQty, PlannedTotalQty) {
			// 	if (PlannedTotalQty < ConfirmedYieldQty){
			// 		return 100;	
			// 	}
			// 	else if (PlannedTotalQty !== "0") {
			// 		return ((ConfirmedYieldQty / PlannedTotalQty) * 100);
			// 	}
			// },

			// /*
			//  * sets the visibility of the progress indicator & its parameters
			//  * @param {string} LatestOperationText 
			//  * @returns {boolean} based on the LatestOperationText
			//  */
			// setVisibleProgressIndicator: function(LatestOperationText, OrderStatusId) {
			// 	if(!OrderStatusId){
			// 		if (LatestOperationText) {
			// 		return true;
			// 	}
			// 		return false;
			// 	} else {
			// 		if(OrderStatusId === "12" || OrderStatusId === "11" || OrderStatusId === "10" || OrderStatusId === "04" ){
			// 			return false;
			// 		}
			// 		return true;
			// 	}
			// },

			// /*
			//  * sets the state of the progress indicator
			//  * @param {string} OrderExecutionEndIsLate 
			//  * @param {string} OrderExecutionStartIsLate 
			//  * @returns {string} based on the parameters
			//  */
			// setProgressIndicatorState: function(OrderExecutionEndIsLate, OrderExecutionStartIsLate) {
			// 	if (OrderExecutionEndIsLate || OrderExecutionStartIsLate) {
			// 		return "Warning";
			// 	} else {
			// 		return "Success";
			// 	}
			// },

			// /*
			//  * returns date of the required format, if Actual, then return actual else return scheduled
			//  * @param {Date} sScheduled
			//  * @param {Date} sActual
			//  * @returns {Date} formatted date
			//  */
			// DatePriority: function(sScheduled, sActual) {
			// 	var oDateFormat;
			// 	if (sActual) {
			// 		oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
			// 			pattern: "EEE, MMM d"
			// 		});
			// 		return oDateFormat.format(new Date(sActual));
			// 	} else {
			// 		oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
			// 			pattern: "EEE, MMM d"
			// 		});
			// 		return oDateFormat.format(new Date(sScheduled));
			// 	}
			// },

			// /*
			//  * To get the time in the required format
			//  * differentiate between actual and scheduled time and return the value along with the text.
			//  * @param {Date} sScheduledDate,sActualDate
			//  * @param {Time} sScheduledTime,sActualTime
			//  * @return {Time(string)} which gives the formatted time if it is actual/scheduled time
			//  */
			// TimePriority: function(sScheduledDate, sActualDate, sScheduledTime, sActualTime) {
			// 	var time = null;
			// 	var sTimeStr = null;
			// 	if (sActualDate) {
			// 		time = new Time({
			// 			style: 'short',
			// 			relativeScale: 'auto'
			// 		});
			// 		sTimeStr = time.formatValue(sActualTime, "string");
			// 		return sTimeStr;
			// 	} else {
			// 		time = new Time({
			// 			style: 'short',
			// 			relativeScale: 'auto'
			// 		});
			// 		sTimeStr = time.formatValue(sScheduledTime, "string");
			// 		return sTimeStr;
			// 	}
			// },

			// /*
			//  * returns text if Actual, then return actual else return scheduled
			//  * @param {Date} sScheduled
			//  * @param {Date} sActual
			//  * @returns {String} Text
			//  */
			// TextBasedonDate: function(sScheduled, sActual) {
			// 	if (sActual) {
			// 		return this.getModel("i18n").getProperty("Actual") + ":";
			// 	} else {
			// 		return this.getModel("i18n").getProperty("Scheduled") + ":";
			// 	}
			// },

			// /*
			//  * returns text if Actual, then return actual else return scheduled
			//  * @param {Date} sScheduled
			//  * @param {Date} sActual
			//  * @returns {String} Text
			//  */
			// TextBasedonDateConfirm: function(sScheduled, sConfirm) {
			// 	if (sConfirm) {
			// 		return this.getModel("i18n").getProperty("Confirmed") + ":";
			// 	} else {
			// 		return this.getModel("i18n").getProperty("Scheduled") + ":";
			// 	}
			// },

			// /*
			//  *get the material name in brackets
			//  *@param {string} sMaterial
			//  * @returns text in brackets
			//  */
			// getMaterialNameInBrackets: function(sMaterial) {
			// 	return "(" + sMaterial + ")";
			// },

			/*
			 * set the object page layout as a reference
			 * @param {object} oObjectPageLayout
			 */
			setObjectPageLayoutReference: function(oObjectPageLayout) {
				this.oObjectPageLayoutinstance = oObjectPageLayout;
			},

			/*
			 * get the object page layout 
			 * @return {object} oObjectPageLayout
			 */
			getObjectPageLayoutReference: function() {
				return this.oObjectPageLayoutinstance;
			},

			/*
			 *Based on flag value,passed yes or no
			 *@param {string} sFinalConfirmation
			 *@retun {string} Yes or No
			 */
			finalConfirmation: function(sFinalConfirmation) {
				if (sFinalConfirmation === "X") {
					return this.getI18NCommonText("Yes");
				} else {
					return this.getI18NCommonText("No");
				}
			},

			// /*
			//  *To get the date and time in the required format 
			//  *in the smart form
			//  *@param {object} oControlEvent
			//  */
			// formatDateTime: function(oControlEvent) {
			// 	var oElement = oControlEvent.getSource();
			// 	var value = oElement.getValue();
			// 	var newDate = DateFormat.getDateTimeInstance({
			// 		pattern: "EEE, MMM d"
			// 	}).format(value);
			// 	/*if (!newDate) {
			// 		return;
			// 	}*/
			// 	var sTime = oElement.data("timeData");
			// 	var sTimeStr = "";
			// 	if (sTime) {
			// 		var time = new Time({
			// 			style: 'short',
			// 			relativeScale: 'auto'
			// 		});
			// 		sTimeStr = ", " + time.formatValue(sTime, "string");
			// 	}
			// 	var innerControls = oElement.getInnerControls();
			// 	if (innerControls.length > 0) {
			// 		var sDateText = newDate + sTimeStr;
			// 		if(!newDate) {
			// 			sDateText = "-";
			// 		}
			// 		innerControls[0].setText(sDateText);
			// 	}
			// },

			// /*
			//  *To get the text in the required format 
			//  *in the smart form
			//  *@param {object} oControlEvent
			//  */
			// formatInBrackets: function(oControlEvent) {
			// 	var oElement = oControlEvent.getSource();
			// 	var innerControls = oElement.getInnerControls();
			// 	var value1 = oElement.getValue();
			// 	var value2 = oElement.data("Name");
			// 	var value;
			// 	if (value2) {
			// 		value = value1 + " (" + value2 + ")";
			// 	} else {
			// 		value = value1;
			// 	}
			// 	//if (innerControls.length > 0) {
			// 	if (value.length === 0) {
			// 		value = "-";
			// 	}
			// 	innerControls[0].setText(value);
			// 	// Making the field value "Bold"
			// 	//innerControls[0].setDesign(sap.ui.commons.LabelDesign.Bold);
			// 	//}
			// },

			/*
			 *Based on the status, pass true or false
			 * @param {string} sStatus
			 * @return {boolean} true or false
			 */
			setEnableStatus: function(sStatus) {
				if (sStatus === "03" || sStatus === "05") {
					return true;
				} else {
					return false;
				}
			},

			// /*
			//  *Return icon color based on flag values
			//  *@param {string} OrderHasProductionHOld
			//  *@return {string} semantic color code
			//  */
			// setOrderHoldIssueIconColor: function(OrderHasProductionHold) {
			// 	if (OrderHasProductionHold) {
			// 		// return "Negative";
			// 		return "#DF0101";
			// 	} else {
			// 		return "#d9d9d9";
			// 	}
			// },

			// /*
			//  *Return #DF0101 based on flag values
			//  *@param {string} OperationExecutionStartIsLate,OperationExecutionEndIsLate
			//  *@return {string} color codes in hexa
			//  */
			// setDelayIconColor: function(OperationExecutionStartIsLate, OperationExecutionEndIsLate) {
			// 	if (OperationExecutionEndIsLate || OperationExecutionStartIsLate) {
			// 		return "#DF0101";
			// 	} else {
			// 		return "#d9d9d9";
			// 	}
			// },

			// /*
			//  *Return #DF0101 based on flag values
			//  *@param {string} OperationYieldDeviationQty
			//  *@return {string} color codes in hexa
			//  */
			// setMissingQuantityIconColor: function(OperationYieldDeviationQty) {
			// 	if (OperationYieldDeviationQty < 0) {
			// 		return "#DF0101";
			// 	} else {
			// 		return "#d9d9d9";
			// 	}
			// },

			// /*
			//  *Return #DF0101 based on flag values
			//  *@param {string} OperationMissingComponents
			//  *@return {string} color codes in hexa
			//  */
			// setMissingComponentIconColor: function(OperationMissingComponents) {
			// 	if (OperationMissingComponents) {
			// 		return "#DF0101";
			// 	} else {
			// 		return "#d9d9d9";
			// 	}
			// },

			// /*
			//  *Return #DF0101 based on flag values
			//  *@param {string} sOpScrapQualityIssue
			//  *@param {string} sInspHasRejectedCharc
			//  *@param {string} sInspHasRejectedInspSubset
			//  *@param {string} sInspHasRejectedInspLot
			//  *@return {string} color codes in hexa
			//  */
			// setMissingQualityIssueIconColor: function(sOpScrapQualityIssue, sInspHasRejectedCharc, sInspHasRejectedInspSubset, sInspHasRejectedInspLot) {
			// 	if (sOpScrapQualityIssue === "X"
			// 		|| sInspHasRejectedCharc === "X" 
			// 		|| sInspHasRejectedInspSubset === "X"
			// 		|| sInspHasRejectedInspLot === "X"){
			// 		return "#DF0101";
			// 	} else {
			// 		return "#d9d9d9";
			// 	}
			// },

			// /*To Remove leading zeroes from material text
			//  * @param {string} sMaterial
			//  * @returns {string} Material without leading zeroes
			//  */
			// removeLeadingZeros: function(sMaterial) {
			// 	sMaterial = sMaterial.replace(/^0+/, '');
			// 	return sMaterial;
			// },

			// /*To get the status
			//  * @param {string} sStatus
			//  * @returns {string} Status corresponding to the integer value
			//  */
			// getStatusText: function(sStatus) {
			// 	if (sStatus === "01") {
			// 		return this.getI18NText("status_created");
			// 	} else if (sStatus === "02") {
			// 		return this.getI18NText("status_partReleased");
			// 	} else if (sStatus === "03") {
			// 		return this.getI18NText("status_released");
			// 	} else if (sStatus === "04") {
			// 		return this.getI18NText("status_tobedeleted");
			// 	} else if (sStatus === "05") {
			// 		return this.getI18NText("status_partConfirmed");
			// 	} else if (sStatus === "06") {
			// 		return this.getI18NText("status_confirmed");
			// 	} else if (sStatus === "07") {
			// 		return this.getI18NText("status_partdelivered");
			// 	} else if (sStatus === "08") {
			// 		return this.getI18NText("status_delivered");
			// 	} else if (sStatus === "09") {
			// 		return this.getI18NText("status_locked");
			// 	} else if (sStatus === "10") {
			// 		return this.getI18NText("status_techCompleted");
			// 	} else if (sStatus === "11") {
			// 		return this.getI18NText("status_closed");
			// 	} else if (sStatus === "12") {
			// 		return this.getI18NText("status_deleted");
			// 	}
			// },

			// /*
			//  *Return string values based on input values
			//  *@param {string} sInspCharOpenCount
			//  *@param {string} sInspCharacteristicCount
			//  *@return {string} provides the progress data in string
			//  */
			// difference: function(sInspCharOpenCount, sInspCharacteristicCount) {
			// 	var difference = 0;
			// 	var sDisplayText;
			// 	if (sInspCharacteristicCount !== 0) {
			// 		difference = sInspCharacteristicCount - sInspCharOpenCount;
			// 		sDisplayText = this.getI18NCommonText("ProgressText", [difference, sInspCharacteristicCount]);
			// 	} else {
			// 		sDisplayText = this.getI18NCommonText("ProgressText", [difference, 0]);
			// 	}
			// 	return sDisplayText;
			// },

			// setPercentValue: function(sPercentValue) {
			// 	return parseInt(sPercentValue);
			// },

			// /*
			//  *To have the text within brackets
			//  * @param {string} sDescription
			//  * @param {string} sId
			//  * @return text within brackets or just the available value
			//  */
			// getCombineDescriptionWithId: function(sDescription, sId) {
			// 	if (sId && !sDescription) {
			// 		return sId;
			// 	} else if (sDescription && sId) {
			// 		return sDescription + " (" + sId + ")";
			// 	} else if (sDescription && !sId) {
			// 		return sDescription;
			// 	}
			// },

			// addColon: function(sText) {
			// 	var sLabel;
			// 	if (sText) {
			// 		sLabel = this.getModel("i18n").getResourceBundle().getText("LABEL_WITH_COLON", [sText]);
			// 	} else {
			// 		sLabel = '';
			// 	}
			// 	return sLabel;
			// },

			setEnableStatusRelease: function(sStatus) {
				if (sStatus === "01" || sStatus === "02") {
					return true;
				} else {
					return false;
				}
			},

			/** 
			 * Calls the oModel.read service to get the missing components
			 * Calculates the other issues also.
			 * @param oModel - The model bound to the parent block.
			 * @param sPath - The path with respect to the order Id selected.
			 */
			handleIsuesValue: function(oModel, sPath, oIssuesBlock) {
				var oObjectPageLayout = this.getObjectPageLayoutReference();
				var oManufacturingOrder = sPath.ManufacturingOrder;
				var sResourcsPath = oIssuesBlock.oParentBlock.getModel("i18n");
				var sMissingCompMessage = oIssuesBlock.byId("idMissingComponents");
				var sDelayMessage = oIssuesBlock.byId("idDelay");
				var sQltyMessage = oIssuesBlock.byId("idQltyIssue");
				var sQtyMessage = oIssuesBlock.byId("idQtyIssue");
				sMissingCompMessage.setVisible(false);
				sDelayMessage.setVisible(false);
				sQltyMessage.setVisible(false);
				sQtyMessage.setVisible(false);
				sQltyMessage.destroyLink();
				if (sPath.OrderHasMissingComponents && !sPath.ReservationIsFinallyIssued) {
					var oOrderFilter = new Filter("ManufacturingOrder", sap.ui.model.FilterOperator.EQ, oManufacturingOrder);
					var aFilters = [oOrderFilter];
					var that = oIssuesBlock;
					// if the flag is true, we do an oModel.read to get the missing components and the value.
					oModel.read("/C_Operationcomponents", {
						filters: aFilters,
						success: $.proxy(function(oData) {
							if (oData.results) {
								var aMissingComponents = [];
								that.aMaterialArray = [];
								for (var iCountResult = 0; iCountResult < oData.results.length; iCountResult++) {
									if (oData.results[iCountResult].MaterialComponentIsMissing && !(oData.results[iCountResult].ReservationIsFinallyIssued)) {
										var oMaterial = oData.results[iCountResult].Material;
										var oMissingQty = oData.results[iCountResult].MissingQuantity;
										aMissingComponents.push({
											material: oMaterial,
											MissingQty: oMissingQty
										});
									}
								}
								aMissingComponents.sort(function(oFirstComponent, oSecondComponent) {
									return oSecondComponent.MissingQty - oFirstComponent.MissingQty;
								});

								if (aMissingComponents.length === 1) {
									oIssuesBlock.aMaterialArray.push(aMissingComponents[0].material);
								} else if (aMissingComponents.length > 1) {
									oIssuesBlock.aMaterialArray.push(aMissingComponents[0].material + " +" + (aMissingComponents.length - 1) + " " +
										sResourcsPath.getProperty("More"));
								}

							}
							//displaying the missing components as links
							var oLink = new sap.m.Link({
								text: oIssuesBlock.aMaterialArray,
								press: function() {
									//on click of the missing components,it scrolls to the components section with the missing components button enabled 
									var aSections = oObjectPageLayout.getSections();
									if (aSections && aSections.length > 1) {
										var aSubSections = aSections[3].getSubSections();
										if (aSubSections && aSubSections.length > 0) {
											var aBlocks = aSubSections[0].getBlocks();
											if (aBlocks && aBlocks.length > 0) {
												var oBlockView = sap.ui.getCore().byId(aBlocks[0].getSelectedView());
												oBlockView.byId("btnSegmntComponents").setSelectedButton(oBlockView.byId("btnSegmntComponents").getButtons()[1]);
												oBlockView.byId("btnSegmntComponents").fireSelect();
											}
										}
										oObjectPageLayout.scrollToSection(oObjectPageLayout.getSections()[3].getId());
									}
								}
							});
							sMissingCompMessage.setVisible(true);
							sMissingCompMessage.setLink(oLink);
						}, oIssuesBlock),
						error: $.proxy(function(results) {}, oIssuesBlock)
					});
				}
				//Checking for the Quality Issue and calculating the % scrap value
				if ((sPath.OrderHasQualityIssue === "X") || (sPath.InspHasRejectedCharc === "X") ||
					(sPath.InspHasRejectedInspSubset === "X") || (sPath.InspHasRejectedInspLot === "X")) {
					var iQltyPercentValue = 0;
					if (sPath.OrderHasQualityIssue === "X") {
						var oConfirmScrapQty = sPath.MfgOrderConfirmedScrapQty;
						var oTotalPlanQty = sPath.MfgOrderPlannedTotalQty;
						if (oConfirmScrapQty !== 0 && oTotalPlanQty !== 0) {
							iQltyPercentValue = Math.round((oConfirmScrapQty / oTotalPlanQty) * 100);
						}
					}
					if ((sPath.InspHasRejectedCharc === "X") || (sPath.InspHasRejectedInspSubset === "X") || (sPath.InspHasRejectedInspLot === "X")) {
						var oQMOrderFilter = new Filter("ManufacturingOrder", sap.ui.model.FilterOperator.EQ, oManufacturingOrder);
						var aQMFilters = [oQMOrderFilter];
						var sQMIssue = 'X';
						// if the flag is true, we do an oModel.read to get the inspection lots with rejections
						oModel.read("/C_MPEOrderWithInspLotWithRjcn", {
							filters: aQMFilters,
							success: $.proxy(function(oData) {
								var aInspectionLots = [];
								var oInspectionLot;
								if (oData.results) {
									for (var iCountResult = 0; iCountResult < oData.results.length; iCountResult++) {
										oInspectionLot = oData.results[iCountResult].InspectionLot;
										aInspectionLots.push(oInspectionLot);
									}
								}
								if (aInspectionLots.length > 0) {
									//displaying the quality issues from inspection lots as links
									var oQltyLink = new sap.m.Link({
										//text: this.aInspectionLots,
										text: aInspectionLots,
										press: function() {
											//on click of the quality issues,it scrolls to the inspection lot section 
											var aSectionsq = oObjectPageLayout.getSections();
											if (aSectionsq && aSectionsq.length > 1) {
												oObjectPageLayout.scrollToSection(oObjectPageLayout.getSections()[6].getId());
											}
										}
									});
									sQltyMessage.setLink(oQltyLink);
									sQltyMessage.setVisible(true);
								}
							}, oIssuesBlock),
							error: $.proxy(function(results) {}, oIssuesBlock)
						});
					}
					if (iQltyPercentValue !== 0) {
						if (sQMIssue === 'X') {
							sQltyMessage.setText(oIssuesBlock.getI18NCommonText("QualityDeviationScrapAndQM", [iQltyPercentValue]));
						} else {
							sQltyMessage.setText(oIssuesBlock.getI18NCommonText("QualityDeviationScrap", [iQltyPercentValue]));
							sQltyMessage.setVisible(true);
						}
					} else {
						sQltyMessage.setText(oIssuesBlock.getI18NCommonText("QualityDeviationQM"));
					}
				}
				//checking for the Quantity issue
				if (sPath.OrderYieldDeviationQty < 0) {
					var oMissingQty = sPath.OrderMissingQuantity;
					var oQtyUnit = sPath.ProductionUnit;
					sQtyMessage.setVisible(true);
					sQtyMessage.setText(sResourcsPath.getProperty("QuantityDeviation") + " : " + oMissingQty + " " + oQtyUnit);
				}
				//checking for the delay issue and calculating interms of days , hours and minutes
				if (sPath.OrderExecutionEndIsLate || sPath.OrderExecutionStartIsLate) {
					var oOPerationEnd = sPath.ExecutionEndLatenessInMinutes;
					var oOPerationStart = sPath.ExecutionStartLatenessInMins;
					var iOpEnd = Math.round(oOPerationEnd);
					var iOpStrt = Math.round(oOPerationStart);
					if (iOpEnd > iOpStrt) {
						var iDelay = iOpEnd;
					} else {
						iDelay = iOpStrt;
					}
					iDelay = iDelay / (24 * 60) + ":" + iDelay / 60 % 24 + ":" + iDelay % 60;
					if (parseInt(iDelay.split(":")[0]) !== 0) {
						var iDays = parseInt(iDelay.split(":")[0]) + sResourcsPath.getProperty("Days");
					} else {
						iDays = "";
					}
					if (parseInt(iDelay.split(":")[1]) !== 0) {
						var iHours = parseInt(iDelay.split(":")[1]) + sResourcsPath.getProperty("Hours");
					} else {
						iHours = "";
					}
					if (parseInt(iDelay.split(":")[2]) !== 0) {
						var iMin = parseInt(iDelay.split(":")[2]) + sResourcsPath.getProperty("Minutes");
					} else {
						iMin = "";
					}
					sDelayMessage.setVisible(true);
					sDelayMessage.setText(sResourcsPath.getProperty("OperationDelayed") + " " + iDays + " " + iHours + " " + iMin + "\n");
				}
			},

			// progressDisplayValue: function(ActValue, TotalValue) {
			// 	var sDisplayText;
			// 	if (ActValue) {
			// 		sDisplayText = this.getModel("i18n").getResourceBundle().getText("ProgressText", [ActValue, TotalValue]);
			// 	}
			// 	return sDisplayText;
			// },

			setEnableRereadMD: function(sStatus) {
				// if (sStatus === "01" || sStatus === "02" || sStatus === "03") {
				if (sStatus === "01") {
					return true;
				} else {
					return false;
				}
			},

			setEnableHoldButton: function(sManufacturingFeature, sManufacturingFeatureIsActive, sStatus) {
				if (sManufacturingFeature === "EPO" && sManufacturingFeatureIsActive === "X") {
					if (sStatus === "06" || sStatus === "08" || sStatus === "09" || sStatus === "09" || sStatus === "10" || sStatus === "11" || sStatus ===
						"12") {
						return false;
					} else {
						return true;
					}
				} else {
					return false;
				}
			},

			getButtonStatus: function(oProperty) {
			
					if (oProperty.OrderIsClosed !== "X" &&
						oProperty.OrderIsConfirmed !== "X" &&
						oProperty.OrderIsDeleted !== "X" &&
						oProperty.OrderIsDelivered !== "X" &&
						oProperty.OrderIsLocked !== "X" &&
						oProperty.OrderIsTechnicallyCompleted !== "X") {
						return true;
					} else {
						return false;
					}
				 

			},
			
		/*
		 *To show/hide icons
		 */

		getFeatureAvailability: function(MfgFeatureIsActiveInAnyPlant) {
        	if(MfgFeatureIsActiveInAnyPlant === "X" || MfgFeatureIsActiveInAnyPlant === true) {
            	return true;
        	} else {
            	return false;
        	}
		},
		
		setEnableConfigButton: function (sProductConfiguration) {
					if (sProductConfiguration !== "000000000000000000") {
						return true;
					} else {
						return false;
					}
				}

		};
	});