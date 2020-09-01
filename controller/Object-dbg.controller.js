/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
/*global location*/
sap.ui.define([
		"i2d/mpe/orders/manages2/controller/BaseController",
		"sap/i2d/mpe/lib/commons1/blocks/OrderDetailsHeaderHelper",
		"sap/ui/model/resource/ResourceModel",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"i2d/mpe/orders/manages2/model/formatter",
		"sap/i2d/mpe/lib/commons1/utils/formatter",
		"sap/i2d/mpe/lib/commons1/utils/util",
		"sap/i2d/mpe/lib/commons1/fragments/OrderOperationStatus",
		"sap/i2d/mpe/lib/popovers1/fragments/MaterialController",
		"sap/m/MessageToast",
		"sap/m/MessageBox",
		"sap/ui/model/Filter",
		"sap/i2d/mpe/lib/commons1/fragments/ApplyHoldDialog",
		"sap/i2d/mpe/lib/commons1/utils/constants",
		"sap/i2d/mpe/lib/qmcomps1/util/Defects",
		"sap/i2d/mpe/lib/qmcomps1/util/Formatter",
		"sap/i2d/mpe/lib/commons1/fragments/OrdSpcfcChange",
		"sap/i2d/mpe/lib/commons1/utils/NavHelper"
	],

	function (BaseController, OrdDetailHeadHelper, ResourceModel, JSONModel, History, formatter, commonFormatter, reuseUtil,
		OrderOperationStatus, MaterialPopOver, MessageToast, MessageBox, Filter,
		ApplyHoldDialog, ReuseProjectConstants, Defects, defectFormatter, OrdSpcfcChange, NavHelper) {
		"use strict";

		return BaseController.extend("i2d.mpe.orders.manages2.controller.Object", {

			formatter: formatter,
			commonFormatter: commonFormatter,
			reuseUtil: reuseUtil,
			defectFormatter: defectFormatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */
			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			onInit: function () {
				// Model used to manipulate control states. The chosen values make sure,
				// detail page is busy indication immediately so there is no break in
				// between the busy indication for loading the view's meta data
				var iOriginalBusyDelay,
					oViewModel = new JSONModel({
						busy: true,
						delay: 0
					});
				var oEventBus = sap.ui.getCore().getEventBus();
				oEventBus.subscribe("AppState", "hanldeAppstateDetailChanges", this.hanldeAppstateDetailChanges, this);
				this._oOneOrderReleaseButton = this.getView().byId("idOneOrderReleaseButton");
				this.getRouter().getRoute("object").attachPatternMatched(this._handleRouteMatched, this);
				// Store original busy indicator delay, so it can be restored later on
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
				this.setModel(oViewModel, "objectView");
				this.getOwnerComponent().getModel().metadataLoaded().then(function () {
					// Restore original busy indicator delay for the object view
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				});
				var oObjectPageLayout = this.getView().byId("idOrderObjectPageLayout");
				formatter.setObjectPageLayoutReference(oObjectPageLayout);
				commonFormatter.setObjectPageLayoutReference(oObjectPageLayout);
				reuseUtil.setObjectPageRefrence(this);
				// initializing popover Instance
				// this.oMaterialPop = new MaterialPopOver();
				var oShopFloorItemModel = new JSONModel();
				this.getView().setModel(oShopFloorItemModel, "shopflooritems");
				var oOrderDetailModel = this.getOwnerComponent().getModel("DetailModel");
				var oOrderDetailData = oOrderDetailModel.getData();
				if (oOrderDetailData.bEnableAutoBinding) {
					this._bDetailsScreenInitialLoad = true;
				} else {
					this._bDetailsScreenInitialLoad = false;
				}

				// this.getView().setModel(this.getOrderDetailPageI18nModel(), "common_i18n");
				this.setModel(new JSONModel({
					"EditButtonVisible": false,
					"ConfirmButtonVisible": false,
					"bIsDisplayOrderSpecificHoldAvailable": false,
					"bIsDisplayOrderSpecificHoldNavigable": false,
					"bIsOrderSpecificHoldAvailable": false
				}), "ActionButtonVisiblity");

				//Check if navigable intents are available
				if (sap.ushell && sap.ushell.Container) {
					var aSemantic = [];
					aSemantic.push("#ProductionOrder-change");
					aSemantic.push("#ShopFloorRouting-change");
					sap.ushell.Container.getService("CrossApplicationNavigation").isIntentSupported(aSemantic).done(function (oCheck) {
						if (oCheck) {
							this.getModel("ActionButtonVisiblity").setProperty("/EditButtonVisible", oCheck["#ProductionOrder-change"].supported);
							this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldNavigable", oCheck["#ShopFloorRouting-change"]
								.supported);
						}
					}.bind(this)).
					fail(function () {
						jQuery.sap.log.error("Reading intent data failed.");
						this.getModel("ActionButtonVisiblity").setProperty("/EditButtonVisible", true);
						this.getModel("ActionButtonVisiblity").setProperty("/ConfirmButtonVisible", true);
						this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldNavigable", true);
					});
				} else {
					this.getModel("ActionButtonVisiblity").setProperty("/EditButtonVisible", true);
					this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldNavigable", true);
				}

				OrdDetailHeadHelper.onInit(this._oOneOrderReleaseButton, oObjectPageLayout, this.getView());

				// Set parameters for event bus
				var oEventBusParams = this.getEventBusParameters();
				var oEventBus = sap.ui.getCore().getEventBus();
				oEventBus.subscribe(oEventBusParams.ApplyHoldDialog.Channel, oEventBusParams.ApplyHoldDialog.Event, oEventBusParams.ApplyHoldDialog
					.Callback, this);
				// Subcribe for events from Release order anyway functionality
				oEventBus.subscribe(oEventBusParams.ReleaseOrderAnyway.Channel, oEventBusParams.ReleaseOrderAnyway.Event, oEventBusParams.ReleaseOrderAnyway
					.Callback, this);
				ApplyHoldDialog.setEventBusParameters(oEventBus, oEventBusParams.ApplyHoldDialog.Channel,
					oEventBusParams.ApplyHoldDialog.Event);
				this._DefectsClass = new Defects();
			},

			onNavToDefect: function (oEvent) {
				this._DefectsClass.onNavToDefect(oEvent);
			},

			defectsCallbackFn: function (aDefects) {
				if (aDefects.length > 0 && aDefects[0].to_ShopFloorItem) {
					this._DefectsClass.setVisibleColumns(true);
				}
			},

			/**
			 * GetOrderDetailPageI18nModel applies text labels from Reuse project
			 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
			 * @public
			 */
			getOrderDetailPageI18nModel: function () {
				var sI18NFilePath = jQuery.sap.getModulePath("sap.i2d.mpe.lib.commons1") + "/" + "i18n/i18n.properties";
				var oI18nModel = new ResourceModel({
					bundleUrl: sI18NFilePath
				});
				return oI18nModel;
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */
			/*
			 * formatter to get the Order number along with Order text ,
			 * as the title in the object page header
			 * @param {string} sManufacturingOrder - the Order number 
			 */
			getOrderNumber: function (sManufacturingOrder) {
				// if (sManufacturingOrder) {
				// 	return this.getI18NText("OrderDetailTitle", [sManufacturingOrder]);
				// }

				return OrdDetailHeadHelper.getOrderNumber(sManufacturingOrder);
			},

			/** 
			 * getI18NText method gets the i18n text from i18n folder based on the key
			 * @public
			 * @param {string} key of i18n text maintained in properties file.
			 * @param {array} pass parameters for that key
			 */
			getI18NText: function (isKey, aValues) {
				return OrdDetailHeadHelper.getI18NText(isKey, aValues);
			},

			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */
			/**
			 * Route matched handler of the view.
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
			 */
			_handleRouteMatched: function (oEvent) {
				var sOrderId = oEvent.getParameter("arguments").orderId;
				this.gsOrderId = sOrderId;
				this.iAppState = oEvent.getParameter("arguments").iAppState;

				this.getModel().metadataLoaded().then(function () {
					this._bindView("/" + sOrderId);
				}.bind(this));
				this.updateOrderModel();
				var sAppState = oEvent.getParameter("arguments").iAppState;
				var sConfigName = oEvent.getParameter("config").name;
				this.getOwnerComponent().extractInnerAppStateFromURL(sAppState, sConfigName, sOrderId);
			},

			/**
			 * Binds the view to the object path.
			 * @param {string} sOrderPath path to the object to be bound
			 * @private
			 */
			_bindView: function (sOrderPath) {
				var that = this;
				// Setting the odatat model to not use batch requests for details screen. 
				// changes are done to improve performance and execute backend calls in parallel
				var oViewModel = this.getModel("objectView"),
					oDataModel = this.getModel();
				// var oDetailModel = this.getModel("DetailModel"),
				// oOrderDetailData = oDetailModel.getData();
				oDataModel.setUseBatch(false);
				this.getView().bindElement({
					path: sOrderPath,
					events: {
						change: this._onBindingChange.bind(this),
						dataRequested: function () {
							that.getModel().metadataLoaded().then(function () {
								// Busy indicator on view should only be set if metadata is loaded,
								// otherwise there may be two busy indications next to each other on the
								// screen. This happens because route matched handler already calls '_bindView'
								// while metadata is loaded.
								oViewModel.setProperty("/busy", true);
							});
						},
						dataReceived: function (oData) {
							// var oModel = that.getView().getModel();
							// var oBindingContext = that.getView().getBindingContext();
							// var MfgFeatureIsActiveInAnyPlant = oModel.getProperty("MfgFeatureIsActiveInAnyPlant", oBindingContext);
							// if (oOrderDetailData.selectedOrderData && MfgFeatureIsActiveInAnyPlant === undefined) {
							// 	MfgFeatureIsActiveInAnyPlant = oOrderDetailData.selectedOrderData.MfgFeatureIsActiveInAnyPlant;
							// }
							var oCurrentOrderData = oData.getParameters().data;
							// var bPEOFeatureAvailable = ;
							if (formatter.getFeatureAvailability(oCurrentOrderData.MfgFeatureIsActiveInAnyPlant)) {
								that._DefectsClass.setProperties(that, that.getView().getBindingContext());
								// var oData = that.getModel().getObject(that.getView().getBindingContext().getPath());
								that._DefectsClass.setFilters(oCurrentOrderData.ManufacturingOrder);
								that._DefectsClass.checkExistingDefects();
							}
							oViewModel.setProperty("/busy", false);
						}
					}
				});
			},

			/**
			 * Triggers the binding to the tables,if the view is bound to the model.
			 * Set the busy indicator, until the blocks are loaded with values
			 * @function
			 * @private
			 */
			_onBindingChange: function (a, b) {
				var oView = this.getView(),
					oViewModel = this.getModel("objectView"),
					oElementBinding = oView.getElementBinding(),
					oCurrentOrder = this.getView().getBindingContext().getObject();

				if (!oElementBinding.getBoundContext()) {
					this.getRouter().getTargets().display("objectNotFound");
					return;
				}
				if (this._bDetailsScreenInitialLoad === false) {
					this.rebindAllTablesOfAllBlocks();
				} else {
					// var oDetailModel = this.getModel("DetailModel");
					// var oOrderDetailData = oDetailModel.getData();
					var oShopFloorItemsModel = this.getView().getModel("shopflooritems");
					// if (oOrderDetailData.selectedOrderData) {
					var bPEOFeatureAvailable = formatter.getFeatureAvailability(oCurrentOrder.MfgFeatureIsActiveInAnyPlant);
					if (!bPEOFeatureAvailable) {
						oShopFloorItemsModel.setData([]);
					} else {
						// OrdDetailHeadHelper.rebindTableOfBlock("idShopFloorItemBlock", "idShopFloorItemSmartTable");
						oShopFloorItemsModel.setData([""]);
					}
					// }
					this._bDetailsScreenInitialLoad = false;
				}

				if (oCurrentOrder.OrderIsShopFloorOrder === "X" && formatter.getButtonStatus(oCurrentOrder)) {
					//Check of order has an existing order change
					reuseUtil.checkOprHasOpenOrdSpcfcChange(this.getModel("OSR"), oCurrentOrder, function (oData) {
						if (oData.results.length === 0) {
							this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", true);
							this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
						} else if (oData.results.length > 0 &&
							oData.results[0].BillOfOperationsGroup !== "" &&
							oData.results[0].BillOfOperationsType !== "" &&
							oData.results[0].BillOfOperationsVariant !== "" &&
							oData.results[0].BillOfOperationsVersion !== "") {
							if (oData.results[0].BillOfOperationsVersionStatus === "10") { //Routing not released
								this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
								this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", true);
							} else {
								this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", true);
								this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
							}
						}
						//Store the results from order change data
						this.getModel("objectView").setProperty("/oOrderSpecificChangeDetails", oData.results[0]);
					}.bind(this));
				} else {
					this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
					this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
				}
				// this.rebindAllTablesOfAllBlocks();
				oViewModel.setProperty("/busy", false);
			},

			/** 
			 * Updates the detail model with the latest operation binded to the view.
			 * Also updates the appstate model
			 *  @private
			 */
			updateOrderModel: function () {
				var oModel = this.getView().getModel("DetailModel");
				var oDetailsData = oModel.getData();
				oDetailsData.orderId = this.gsOrderId;
				oModel.setData(oDetailsData);
				var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
				var aProperties = ioAppStateModel.getProperty("/appState");
				aProperties.detailPage = oDetailsData;
				this.getOwnerComponent().updateAppStateFromAppStateModel();
			},

			/** 
			 * This function rebinds all the tables of all the blocks,
			 * Its kind of notifying the controllers of different blocks
			 * because the controllers of blocks are not been communicated anyway, just binding element in object page.
			 * @private
			 */
			rebindAllTablesOfAllBlocks: function () {
				// //Notifying blocks, that data has been binded to object page, so load the data in table
				// this.rebindTableOfBlock("idShopFloorItemBlock", "idShopFloorItemSmartTable");
				// this.rebindTableOfBlock("idComponentsBlock", "idAllComponentsTable");
				// this.rebindTableOfBlock("idOperationsScheduleBlock", "idAllOrderScheduleTable");
				// this.rebindTableOfBlock("idOrderConfirmationBlock", "idAllConfirmationTable");
				// this.rebindTableOfBlock("idInspectionBlock", "idInspectionBlockSmartTable");

				//OrdDetailHeadHelper.setCurrentView(this.getView());
				var oBindingContext = this.getView().getBindingContext();
				var oModel = this.getView().getModel();
				var MfgFeatureIsActiveInAnyPlant = oModel.getProperty("MfgFeatureIsActiveInAnyPlant", oBindingContext);
				var bPEOFeatureAvailable = formatter.getFeatureAvailability(MfgFeatureIsActiveInAnyPlant);
				OrdDetailHeadHelper.rebindAllTablesOfAllBlocks(bPEOFeatureAvailable);
				if (!bPEOFeatureAvailable) {
					var oShopFloorItemsModel = this.getView().getModel("shopflooritems");
					oShopFloorItemsModel.setData([]);
				}
			},

			// Function rebindTableOfBlock moved from ObjectController to OrderDetailsHeaderHelper
			// in the commons1 reuse project
			/** 
			 * Rebinds the a table of a perticular block
			 * @param sBlockId - Gives the Block Id
			 * @param sTableId - Gives the table Id whose rebind method is to be called.
			 * @private
			 */
			// rebindTableOfBlock: function(sBlockId, sTableId) {
			// 	var oBlock = this.getView().byId(sBlockId);
			// 	var sViewId = oBlock.getSelectedView();
			// 	if (sViewId) {
			// 		var oBlockView = sap.ui.getCore().byId(sViewId);
			// 		//Reseting segmented button to first button in OrderOperationsBlock
			// 		if (sBlockId === "idOrderOperationsBlock") {
			// 			var oSegmentedBtn = oBlockView.byId("btnSegmntOrderOperation");
			// 			oSegmentedBtn.setSelectedButton(oSegmentedBtn.getButtons()[0]);
			// 		}
			// 		var oSmartTable = oBlockView.byId(sTableId);
			// 		oSmartTable.rebindTable();
			// 	}
			// },

			/**
			 * Handler for Edit order 
			 * This method witll open SAP CO02 transaction in a new tab.
			 * @member i2d.mpe.orders.manages2.controller.Object
			 * @public
			 **/
			handleEditOrderPress: function () {
				// var sOrder = this.getView().getBindingContext().getObject().ManufacturingOrder;
				// reuseUtil.editOrder(sOrder);

				var sOrder = this.getView().getBindingContext().getObject().ManufacturingOrder;

				OrdDetailHeadHelper.handleEditOrderPress(sOrder);
			},

			/**
			 * Handler for Order  confirmation.
			 * this methods will open SAP WEB GUI transaction CO15.
			 * @member i2d.mpe.orders.manages2.controller.Object
			 * @public
			 **/
			handleConfirmOrderPress: function (oEvent) {
				// var sOrder = oEvent.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;
				// var para = {
				// 	"CORUF-AUFNR": sOrder
				// };
				// var fgetService = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService;
				// var oCrossAppNavigator = fgetService && fgetService("CrossApplicationNavigation");
				// // trigger navigation
				// if (oCrossAppNavigator) {
				// 	oCrossAppNavigator.toExternal({
				// 		target: {
				// 			semanticObject: "ProductionOrderConfirmation",
				// 			action: "createOrderConfirmation"
				// 		},
				// 		params: para
				// 	});
				// }

				var sOrder = oEvent.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;
				var sPara = {
					"CORUF-AUFNR": sOrder
				};
				var fgetService = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService;
				var oCrossAppNavigator = fgetService && fgetService("CrossApplicationNavigation");
				var sSemanticObject = "ProductionOrderConfirmation";
				var sAction = "createOrderConfirmation";

				OrdDetailHeadHelper.handleConfirmOrderPress(sPara, oCrossAppNavigator, sSemanticObject, sAction);
			},

			/** 
			 * Handler for status link press, opens a popover which shows the order status information
			 * @param oEvent
			 *  @member i2d.mpe.orders.manages2.controller.Object
			 * @public
			 */
			handleStatusLinkPress: function (oEvent) {
				// OrderOperationStatus.openStatusPopOver(oEvent, this);

				// Object instance is transferred here to OrderDetailsHeaderHelper 
				// because it is needed for the status popover	
				OrdDetailHeadHelper.handleStatusLinkPress(oEvent, this);
			},

			/** 
			 * Handler for material link press, opens a popover which shows the details of the material
			 * @param oEvent
			 *  @member i2d.mpe.orders.manages2.controller.Object
			 * @public
			 */
			handleMaterialLinkPress: function (oEvent) {
				// var oContext = oEvent.getSource().getBindingContext();
				// var oModel = oContext.getModel();
				// var sProductionPlant = oModel.getProperty("ProductionPlant", oContext);
				// var sMaterial = oModel.getProperty("Material", oContext);
				// this.oMaterialPop.openMaterialPopOver(oEvent, this, sMaterial, sProductionPlant);

				var oContext = oEvent.getSource().getBindingContext();
				var oModel = oContext.getModel();
				var sProductionPlant = oModel.getProperty("ProductionPlant", oContext);
				var sMaterial = oModel.getProperty("Material", oContext);
				// var sMRPArea = oModel.getProperty("MRPArea", oContext) || oModel.getProperty("ProductionPlant", oContext);

				// Object instance is transferred here to OrderDetailsHeaderHelper 
				// because it is needed for the material popover
				OrdDetailHeadHelper.handleMaterialLinkPress(oEvent, this, sMaterial, sProductionPlant);
			},

			/** 
			 * Handler for workcenter link press, opens a popover which shows the details of the workcenter
			 * @param oEvent
			 */
			handleWorkCenterPress: function (oEvent) {
				// this.oWorkCenterPop.openWorkCenterPopOver(oEvent, this);

				// Object instance is transferred here to OrderDetailsHeaderHelper 
				// because it is needed for the workcenter popover
				OrdDetailHeadHelper.handleWorkCenterPress(oEvent, this);
			},

			/* Update the model with the latest order id,
			 * On subscribing, using Event bus
			 * @param oEvent -The channel of the event to subscribe to. 
			 * @param oAppstate - The identifier of the event to listen for
			 * @param oData - Contains the oData which is saved in the Appstate model.
			 */
			hanldeAppstateDetailChanges: function (oEvent, oAppstate, oData) {
				var oModel = this.getOwnerComponent().getModel("DetailModel");
				var oOrderDetailData = oModel.getData();
				oOrderDetailData.orderId = oData.orderId;
				if (oData.selectedOrderData) {
					oOrderDetailData.selectedOrderData = oData.selectedOrderData;
				}
				oModel.setData(oOrderDetailData);
			},

			/**
			 * Unsubscribe the event bus before exiting
			 * @member i2d.mpe.orders.manages2.controller.Object
			 * @public
			 */
			onExit: function () {
				var oEventBus = sap.ui.getCore().getEventBus();
				oEventBus.unsubscribe("AppState", "hanldeAppstateDetailChanges", this.hanldeAppstateDetailChanges, this);
				var oEventBusParams = this.getEventBusParameters();
				//Unsubscribe hold event bus
				oEventBus.unsubscribe(oEventBusParams.ApplyHoldDialog.Channel, oEventBusParams.ApplyHoldDialog.Event, oEventBusParams.ApplyHoldDialog
					.Callback, this);
				//Unsubscribe Release Order anyway event from event bus
				oEventBus.unsubscribe(oEventBusParams.ReleaseOrderAnyway.Channel, oEventBusParams.ReleaseOrderAnyway.Event,
					oEventBusParams.ReleaseOrderAnyway.Callback, this);
			},

			handleReleaseOrderPress: function (oEvent) {
				// var sOrder = oEvent.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;
				// var oSuccessMessage = {aError:[], aWarning:[]};
				// var oLocalModel = this.getView().getModel();
				// this.oIssuesBlock = this.byId("idIssuesBlock-Collapsed");
				// this.oIssuesBlock.oParentBlock = this.getView().byId("idIssuesSubSection");
				// var mParams = {"method": "POST",
				//         	"urlParameters": {
				//             	"ManufacturingOrder": "" },
				// 	"success": function(oData, response) {
				// 		var oModel;
				// 		var oOrderDetailData;
				// 		var oParentModel;
				// 		var sPath;
				//             	var oResponse = JSON.parse(response.headers["sap-message"]);
				//             	if(oResponse.severity === "error" || oResponse.severity === "warning"){
				//         			if(oResponse.severity === "error"){
				//             			oSuccessMessage.aError.push(oResponse);
				//         			} else {
				//             			oSuccessMessage.aWarning.push(oResponse);
				//         			}
				//             	}
				//             	for(var i = 0; i < oResponse.details.length; i++){
				//             		if(oResponse.details[i].severity === "error" || oResponse.details[i].severity === "warning"){
				//             			if(oResponse.details[i].severity === "error"){
				//         					oSuccessMessage.aError.push(oResponse.details[i]);
				//         				} else {
				//         		  			oSuccessMessage.aWarning.push(oResponse.details[i]);
				//         				}
				//             		}
				//             	}
				//             	var sMessageText,sFinalText,bCompact,z;
				//             	if(oSuccessMessage.aError.length > 0 ){
				//             		sMessageText = this.getI18NText("oneOrderReleaseRequestErrorMSG", [oData.ManufacturingOrder] );
				//                	sFinalText = oSuccessMessage.aError[0].message;
				// 	                for (z = 1; z < oSuccessMessage.aError.length; z++ ){
				//     	              sFinalText = sFinalText + "\n" + oSuccessMessage.aError[z].message;
				//         	        }
				//             	    if(oSuccessMessage.aWarning.length > 0){
				//                 		for (z = 0; z < oSuccessMessage.aWarning.length; z++ ){
				//                 			sFinalText = sFinalText + "\n" + this.getI18NText("WarningInBrackets", oSuccessMessage.aWarning[z].message );
				//                 		}	
				//                 		sMessageText = this.getI18NText("orderReleaseErrorAndWarningMSG", [oSuccessMessage.aError.length, oSuccessMessage.aWarning.length] );
				//                 	}
				//         	        bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				//             	    this.getDynamicMessageBox(sMessageText, MessageBox.Icon.ERROR, this.getI18NText("ErrorPopupTitle"), [MessageBox.Action.CLOSE], "ErrorOrderMSG", sFinalText,bCompact);
				//             	} else if (oSuccessMessage.aWarning.length > 0){
				//                		sMessageText = this.getI18NText("oneOrderReleaseWarningMSG", [oData.ManufacturingOrder] );
				//                	sFinalText = oSuccessMessage.aWarning[0].message;
				// 	                for ( z = 1; z < oSuccessMessage.aWarning.length; z++ ){
				//     	              sFinalText = sFinalText + "\n" + oSuccessMessage.aWarning[z].message;
				//         	        }
				//             	    bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				//                 	this.getDynamicMessageBox(sMessageText, MessageBox.Icon.WARNING , this.getI18NText("WarningPopupTitle"), [MessageBox.Action.CLOSE], "WarningOrderMSG", sFinalText,bCompact);
				//                  this._oOneOrderReleaseButton.setEnabled(false);
				//                  this.rebindAllTablesOfAllBlocks();
				// 			oModel = this.oIssuesBlock.getModel("DetailModel");
				// 			oOrderDetailData = oModel.getData();
				// 			this.oIssuesBlock.sOrderId = oOrderDetailData.orderId;
				// 			oParentModel = this.oIssuesBlock.oParentBlock.getModel();
				// 			sPath = this.oIssuesBlock.oParentBlock.getModel().oData[this.oIssuesBlock.sOrderId];
				// 			formatter.handleIsuesValue(oParentModel, sPath, this.oIssuesBlock);                	    	                    
				// 	            } else {
				//     	          	sMessageText = this.getI18NText("oneOrderReleasedSuccessMSG", [oData.ManufacturingOrder] );
				//         	      	MessageToast.show(sMessageText,{duration:5000});
				//             	    this._oOneOrderReleaseButton.setEnabled(false);
				//             	    this.rebindAllTablesOfAllBlocks();
				//             	   	oModel = this.oIssuesBlock.getModel("DetailModel");
				// 			oOrderDetailData = oModel.getData();
				// 			this.oIssuesBlock.sOrderId = oOrderDetailData.orderId;
				// 			oParentModel = this.oIssuesBlock.oParentBlock.getModel();
				// 			sPath = this.oIssuesBlock.oParentBlock.getModel().oData[this.oIssuesBlock.sOrderId];
				// 			formatter.handleIsuesValue(oParentModel, sPath, this.oIssuesBlock);                	    
				//             	}
				//         	}.bind(this),
				//         	"error": function(oError) {
				//             	MessageToast.show(this.getI18NText("ReleaseFailed"));
				//             	this._oOneOrderReleaseButton.setEnabled(false);
				//         	}
				// };
				// mParams.urlParameters.ManufacturingOrder = sOrder;
				// oLocalModel.callFunction("/C_ManageordersReleaseorder", mParams);

				var sOrder = oEvent.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;
				//the refresh in the next line is done to get for sure new data on the 
				//production order popover for the status and the current-/ next operation after 
				//the Release Button is triggerd otherwise there is different data on the 
				//worklist and the popover shown if the popover is already opened before  
				//the mentioned button is triggered because data is stored in memory
				this.getModel("PRODORD").refresh(false, true);
				var oLocalModel = this.getView().getModel();
				// var oGlobalLocalModel = new sap.ui.model.json.JSONModel(oLocalModel);
				// this.setModel(oGlobalLocalModel, "globalModel");
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				var oHoldModel = this.getModel("HoldModel");
				this.oIssuesBlock = this.byId("idIssuesBlock-Collapsed");
				this.oIssuesBlock.oParentBlock = this.getView().byId("idIssuesSubSection");

				//OrdDetailHeadHelper.setCurrentView(this.getView());
				OrdDetailHeadHelper.handleReleaseOrderPress(sOrder, oLocalModel, this.oIssuesBlock, bCompact, oHoldModel);
				// adding event bus for release anyway functionality
				var oEventBus = sap.ui.getCore().getEventBus();
				var oEventBusParams = this.getEventBusParameters();
				OrdDetailHeadHelper.setEventBusParameters(oEventBus, oEventBusParams.ReleaseOrderAnyway.Channel,
					oEventBusParams.ReleaseOrderAnyway.Event);
			},

			handleOrderHoldButton: function (oEvent) {
				var oContext = oEvent.getSource().getBindingContext();
				var oModel = oContext.getModel();
				var sOrder = oEvent.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;
				var sPlant = oModel.getProperty("ProductionPlant", oContext);
				var sMaterial = oModel.getProperty("Material", oContext);
				var oLocalModel = this.getView().getModel();
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				this.oIssuesBlock = this.byId("idIssuesBlock-Collapsed");
				this.oIssuesBlock.oParentBlock = this.getView().byId("idIssuesSubSection");

				var oHoldObject = {
					ManufacturingOrder: sOrder,
					ProductionPlant: sPlant,
					Material: sMaterial
						//OrderInternalID: 
						//OrderOperationInternalID: 
						//ShopFloorItem: 
						//Workcenter: 
				};
				var aHoldTypesRequired = [ReuseProjectConstants.HOLD.TYPE_ORDER, ReuseProjectConstants.HOLD.TYPE_MATERIAL];
				ApplyHoldDialog.initAndOpen(oHoldObject, this.getModel("HoldModel"), aHoldTypesRequired, undefined, ReuseProjectConstants.HOLD.TYPE_ORDER,
					false);
			},

			getEventBusParameters: function () {
				// define events' details here for which event bus will be subscribed
				var oEventBusParams = {
					ApplyHoldDialog: {
						Channel: "sap.i2d.mpe.orders.manages2.Worklist",
						Event: "onHoldSuccessfullyApplied",
						Callback: this.onHoldSuccessfullyComplete
					},
					ReleaseOrderAnyway: {
						Channel: "sap.i2d.mpe.orders.manages2.Object",
						Event: "onReleaseOrderAnywayAppliedDetails",
						Callback: this.onReleaseOrderAnywayCallback
					}
				};
				return oEventBusParams;
			},

			onReleaseOrderAnywayCallback: function (sChannelId, sEventId, oResponse) {

				var sOrder = this.getView().getModel().oData[this.gsOrderId].ManufacturingOrder;
				//the refresh in the next line is done to get for sure new data on the 
				//production order popover for the status and the current-/ next operation after 
				//the Release Button is triggerd otherwise there is different data on the 
				//worklist and the popover shown if the popover is already opened before  
				//the mentioned button is triggered because data is stored in memory
				this.getModel("PRODORD").refresh(false, true);
				var oLocalModel = this.getView().getModel();
				var bCompact;
				if (this.getView().$) {
					bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				}
				var oHoldModel = this.getModel("HoldModel");
				this.oIssuesBlock = this.byId("idIssuesBlock-Collapsed");
				this.oIssuesBlock.oParentBlock = this.getView().byId("idIssuesSubSection");

				OrdDetailHeadHelper.handleReleaseOrderPress(sOrder, oLocalModel, this.oIssuesBlock, bCompact, oHoldModel, true);
				OrdDetailHeadHelper.setEventBusParameters();
			},

			onHoldSuccessfullyComplete: function (sChannelId, sEventId, oResponse) {
				var sMessageText, sFinalText;
				if (oResponse.success) {
					sMessageText = oResponse.info;
					MessageToast.show(sMessageText);
					this.rebindAllTablesOfAllBlocks();
				} else {
					var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
					sMessageText = oResponse.info;
					this.getDynamicMessageBox(sMessageText, MessageBox.Icon.ERROR, "Error", [MessageBox.Action.CLOSE], "ErrorOrderMSG", sFinalText,
						bCompact);
				}
			},
			/** 
			 * getDynamicMessageBox method gets the Message box control with dynamic inputs
			 * @public
			 * @param {string} sMessageText for initial message on message box.
			 * @param {icon} icon type for success or warning or error.
			 * @param {stitle} Title for message box.
			 * @param {Message.Action} Actions to execute after click event
			 * @param {string} id for message box.
			 * @param {string} sFinalText is final text to be displayed into message box.
			 * @param {int} length for compact style class
			 */
			getDynamicMessageBox: function (sMessageText, icon, stitle, actions, id, sFinalText, bCompact) {
				//	MessageBox.show(sMessageText, {
				// 	icon: icon? icon : MessageBox.Icon.NONE,
				// 	title: stitle ? stitle : "",
				// 	actions: actions ? actions : MessageBox.Action.OK,
				// 	id: id ? id : "DefaultMessageBoxId",
				// 	details: sFinalText ? sFinalText : "Error",
				// 	styleClass: bCompact? "sapUiSizeCompact" : ""
				// });

				OrdDetailHeadHelper.getDynamicMessageBox(sMessageText, icon, stitle, actions, id, sFinalText, bCompact);
			},
			handleRereadButtonPress: function (oEvent) {
				var sOrder = oEvent.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;
				//the refresh in the next line is done to get for sure new data on the 
				//production order popover for the status and the current-/ next operation after 
				//the Reread Button is triggerd otherwise there is different data on the 
				//worklist and the popover shown if the popover is already opened before  
				//the mentioned button is triggered because data is stored in memory
				this.getModel("PRODORD").refresh(false, true);
				var oLocalModel = this.getView().getModel();
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				var oViewModel = this.getModel("objectView");
				var oHoldModel = this.getModel("HoldModel");

				this.oIssuesBlock = this.byId("idIssuesBlock-Collapsed").getController();
				// this.oIssuesBlock.oParentBlock = this.getView().byId("idIssuesSubSection");
				OrdDetailHeadHelper.handleRereadButtonPress(sOrder, oLocalModel, this.oIssuesBlock, bCompact, oViewModel, oHoldModel);
			},
			onPressGoToConfigPage: function (oEvent) {
				var oContext = oEvent.getSource().getBindingContext();
				var oModel = oContext.getModel();
				var sOrder = this.getView().getBindingContext().getObject().ManufacturingOrder;
				var sProductConfiguration = oModel.getProperty("ProductConfiguration", oContext);
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("Configuration", {
					orderId: sOrder
				});
			},

			onPressOrdSpcfcChange: function () {
				OrdSpcfcChange.initAndOpen({
					oHoldModel: this.getView().getModel("HoldModel"),
					oCRModel: this.getView().getModel("CR"),
					oOSRModel: this.getView().getModel("OSR"),
					oSelectedOrder: this.getView().getBindingContext().getObject(),
					oOrderSpecificChangeDetails: this.getView().getModel("objectView").getProperty("/oOrderSpecificChangeDetails"),
					oCallBack: this.onOrdSpcfcChangeCallBackObject.bind(this),
					Ischangeforwholeorder: true
				});
			},

			onPressDisplayOrdScpfcChange: function (oEvent) {
				NavHelper.navToShopFloorRoutingChange(this.getView().getModel("objectView").getProperty("/oOrderSpecificChangeDetails"));
			},

			onOrdSpcfcChangeCallBackObject: function (oData) {
				this.getView().getModel("objectView").setProperty("/oOrderSpecificChangeDetails", oData);
				this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
				this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", true);
			}
		});
	});