/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"i2d/mpe/orders/manages2/controller/BaseController",
	"sap/i2d/mpe/lib/commons1/fragments/ManageOrderWorklistHelper",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel",
	"i2d/mpe/orders/manages2/model/formatter",
	"sap/i2d/mpe/lib/commons1/utils/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/i2d/mpe/lib/aors1/AOR/AORFragmentHandler",
	"sap/i2d/mpe/lib/popovers1/fragments/IssuePopOverController",
	"sap/i2d/mpe/lib/popovers1/fragments/MaterialController",
	"sap/i2d/mpe/lib/popovers1/fragments/ProductionOrderController",
	"sap/i2d/mpe/lib/commons1/utils/saveAsTile",
	"sap/i2d/mpe/lib/commons1/fragments/OrderOperationStatus",
	"sap/i2d/mpe/lib/commons1/utils/util",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/i2d/mpe/lib/commons1/fragments/EditQtyAndDateDialog",
	"sap/i2d/mpe/lib/commons1/fragments/ApplyHoldDialog",
	"sap/i2d/mpe/lib/commons1/utils/constants",
	"sap/i2d/mpe/lib/commons1/fragments/OrdSpcfcChange",
	"sap/i2d/mpe/lib/commons1/utils/NavHelper"

], function (BaseController, WorklistHelper, ResourceModel, JSONModel, formatter, commonFormatter, Filter, FilterOperator, AORReuse,
	IssuePopOver, MaterialPopOver, ProductionOrderPopOver,
	TileManagement, OrderOperationStatus, ReuseUtil, MessageToast, MessageBox, EditQtyAndDateDialog, ApplyHoldDialog,
	ReuseProjectConstants, OrdSpcfcChange, NavHelper) {
	"use strict";

	return BaseController.extend("i2d.mpe.orders.manages2.controller.Worklist", {

		formatter: formatter,
		commonFormatter: commonFormatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {

			var that = this;

			// flag to check if AOR filter has been applied on Smart Table
			this.bAORFilterFlag = false;
			this.bAORDeleted = false;
			this.bAssignDefaultStatusFilter = true;
			this._oSmartFilter = this.getView().byId("idSmartFilterBar");
			this._oVariantMgt = this.getView().byId("idSmartVManagement");
			this._osmartTable = this.getView().byId("idMonitorOrdersTable");
			this._oErrorMessageToggleButton = this.getView().byId("idErrorMessageCountToggleButton");
			this._bInitialLoadFilterAppStateCheck = true;

			//Independent from semantic check
			// get the personalization container to check if AOR is assigned
			sap.ushell.Container.getService("Personalization").getContainer("i2d.mpe.Supervisor")
				.done(function (oContainer) {
					if (oContainer.getItemValue("AssignedSupervisors")) {
						that.AssignedSupervisor = oContainer.getItemValue("AssignedSupervisors");
					}
					if (oContainer.getItemValue("AssignedWorkcenters")) {
						that.AssignedWorkcenter = oContainer.getItemValue("AssignedWorkcenters");
					}
					that.loadAORData();
				});

			var oEventBus = sap.ui.getCore().getEventBus();
			var oEventBusParams = this.getEventBusParameters();
			// Subcribe for events from EditQtyAndDateDialog for Edit Qty and Date funcionality
			oEventBus.subscribe(oEventBusParams.EditQtyAndDateDialog.Channel, oEventBusParams.EditQtyAndDateDialog.Event, oEventBusParams.EditQtyAndDateDialog
				.Callback, this);
			// Subcribe for events from ApplyHoldDailog for Apply Hold funcionality
			oEventBus.subscribe(oEventBusParams.ApplyHoldDialog.Channel, oEventBusParams.ApplyHoldDialog.Event, oEventBusParams.ApplyHoldDialog
				.Callback, this);
			// Subcribe for events from Release order anyway functionality
			oEventBus.subscribe(oEventBusParams.ReleaseOrderAnyway.Channel, oEventBusParams.ReleaseOrderAnyway.Event, oEventBusParams.ReleaseOrderAnyway
				.Callback, this);

			this.sSelectedVariant = "";
			var sComponentId = sap.ui.core.Component.getOwnerIdFor(this.getView());
			var oComponent = sap.ui.component(sComponentId);
			if (oComponent && oComponent.getComponentData() && oComponent.getComponentData().startupParameters && oComponent.getComponentData()
				.startupParameters.VariantID) {
				this.sSelectedVariant = oComponent.getComponentData().startupParameters.VariantID[0];
				this.bAssignDefaultStatusFilter = false;
			}
			// ignoring fields from smart table personalisation
			this._osmartTable.setIgnoreFromPersonalisation(
				"ManufacturingOrder,Material,MfgOrderScheduledStartDate,MfgOrderScheduledStartTime,MfgOrderScheduledEndDate,MfgOrderScheduledEndTime,MfgOrderActualStartDate,MfgOrderActualEndDate, MfgOrderActualStartTime, MfgOrderPlannedStartDate, MfgOrderPlannedEndDate,  MfgOrderConfirmedEndDate, MfgOrderTotalCommitmentDate, MfgOrderCreationDate, LastChangeDate, MfgOrderScheduledReleaseDate, MfgOrderActualReleaseDate, MfgOrderPlannedReleaseDate, MfgOrderConfirmedEndDate,MfgOrderConfirmedEndTime,InspHasRejectedCharc,InspHasRejectedInspLot,InspHasRejectedInspSubset"
			);
			this.getRouter().getRoute("worklist").attachPatternMatched(this.handleRouteMatched, this);
			oEventBus.subscribe("AppState", "hanldeAppstateChanges", this.handleAppStateChanges, this);
			ReuseUtil.setWorklistCtrlReference(this);
			this._oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this._oMessageManager = sap.ui.getCore().getMessageManager();
			this._oMessageManager.registerObject(this.getView(), true);
			this._oMessageManager.registerMessageProcessor(this._oMessageProcessor);
			this._oMessageManager.removeAllMessages();
			this._oOrderReleaseButton = this.getView().byId("idOrderReleaseButton");
			this._oEditButton = this.getView().byId("idEditButton");
			this._oOrderEditQtyAndDateButton = this.getView().byId("idOrderEditQtyAndDateButton");
			this._oOrderHoldButton = this.getView().byId("idOrderHoldButton");
			this._oRereadButton = this.getView().byId("idMasterDataRereadButton");

			this.setModel(new JSONModel({
				"oOrderSpecificChangeDetails": {}
			}), "worklistView");

			var sReleaseButtonVisiblity = true;
			var sEditButtonNavigable = true;
			var sEditQtyAndDateButtonVisiblity = true;
			var sHoldButtonVisiblity = true;
			var sRereadButtonVisibility = true;
			if (sap.ushell && sap.ushell.Container) {
				// var oService = ;
				var aSemantic = [];
				// var oSemanticProductionOrderChange = ; //Intent-action
				aSemantic.push("#ProductionOrder-change");
				sap.ushell.Container.getService("CrossApplicationNavigation").isIntentSupported(aSemantic).done(function (oCheck) {
					if (oCheck) {
						sEditButtonNavigable = oCheck["#ProductionOrder-change"].supported;
						WorklistHelper.onInit(sReleaseButtonVisiblity, sEditButtonNavigable, sHoldButtonVisiblity, sRereadButtonVisibility, this.getView(),
							sEditQtyAndDateButtonVisiblity);
					}
				}.bind(this)).
				fail(function () {
					jQuery.sap.log.error("Reading intent data failed.");
					sEditButtonNavigable = false;
					WorklistHelper.onInit(sReleaseButtonVisiblity, sEditButtonNavigable, sHoldButtonVisiblity, sRereadButtonVisibility, this.getView(),
						sEditQtyAndDateButtonVisiblity);
				}.bind(this));

			} else {
				WorklistHelper.onInit(sReleaseButtonVisiblity, sEditButtonNavigable, sHoldButtonVisiblity, sRereadButtonVisibility, this.getView(),
					sEditQtyAndDateButtonVisiblity);
			}
		},

		onDataReceived: function (oEvent) {
			if (oEvent.getParameters().getParameters().data &&
				oEvent.getParameters().getParameters().data.results &&
				oEvent.getParameters().getParameters().data.results[0]) {

				var oIssuesData = {};
				oIssuesData.issues = [{
						id: "All",
						name: this.getI18NText("AllIssues")
					}, {
						id: "Delay",
						name: this.getI18NText("Delay")
					}, {
						id: "ComponentIssue",
						name: this.getI18NText("ComponentIssue")
					},
					/*{
						id: "ToolIssue",
						name: this.getI18NText("ToolIssue")
					},*/
					{
						id: "QuantityIssue",
						name: this.getI18NText("QuantityIssue")
					}, {
						id: "QualityIssue",
						name: this.getI18NText("QualityIssue")
					}
				];

				var aComponents = oEvent.getParameters().getParameters().data.results;
				var sHoldVisible = aComponents[0].MfgFeatureIsActiveInAnyPlant;
				if (sHoldVisible === "X" || sHoldVisible === true) {
					oIssuesData.issues.push({
						id: "ProductionHold",
						name: this.getI18NText("ProductionHold")
					});
				}

				var oCustomFilterModel = new JSONModel(oIssuesData);
				if (!this.getModel("customHoldFiltersModel")) {
				this.getView().setModel(oCustomFilterModel, "customHoldFiltersModel");
				}
			}
		},

		/**
		 * onHandleMessagesButtonPress is called when error message button in footer is clicked
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 * @param {object} oEvent event information is provided based on the control
		 */
		onHandleMessagesButtonPress: function (oEvent) {
			var oMessagesButton = oEvent.getSource();
			if (!this._messagePopover) {
				this._messagePopover = sap.ui.xmlfragment("i2d.mpe.orders.manages2.fragments.MessagePopover", this);
				oMessagesButton.addDependent(this._messagePopover);
			}
			this._messagePopover.toggle(oMessagesButton);
		},

		/**
		 * GetWorklistI18nModel applies text labels from Reuse project
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		getWorklistI18nModel: function () {
			var sI18NFilePath = jQuery.sap.getModulePath("sap.i2d.mpe.lib.commons1") + "/" + "i18n/i18n.properties";
			var oI18NModel = new ResourceModel({
				bundleUrl: sI18NFilePath
			});
			return oI18NModel;
		},

		/**
		 * OnAfterRendering of Worklist
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		onAfterRendering: function () {
			if (!this.getModel("customFiltersModel")) {
				this.setCustomFiltersData();
			}
			// getting semantic object and action from the pageId
			var sPageId = this.getView().getId();
			var sPageIdArray = sPageId.split("-");
			this.oSemanticObj = "#" + sPageIdArray[1] + "-" + sPageIdArray[2];
		},

		/** 
		 * 
		 * ApplyFilterOnAOR method applies the filter based on the AOR selected.This method gets called from reuse library project.
		 * @public
		 *  @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @param {obejct} oSelectedSupervisor AOR Selection containing SuperVisor Information 
		 * @param {obejct} oSelectedWorkcenter AOR Selection containing WorkCenter Information
		 */
		ApplyFilterOnAOR: function (oSelectedSupervisor, oSelectedWorkcenter) {
			this.AssignedSupervisor = oSelectedSupervisor;
			this.AssignedWorkcenter = oSelectedWorkcenter;

			// check if AOR has been deleted, if yes then set the flag bAORDeleted to true
			if ((this.AssignedSupervisor && this.AssignedSupervisor !== null && this.AssignedSupervisor.length > 0) || (this.AssignedWorkcenter &&
					this.AssignedWorkcenter !== null && this.AssignedWorkcenter.length > 0)) {

				this.bAORDeleted = false;

			} else {
				this.bAORDeleted = true;

			}
			this.bAORFilterFlag = true;
			this._osmartTable.rebindTable();
			TileManagement.updateTileCountURL(this);
		},

		/**
		 * Calls the personalization service and shows the AOR assigned if any to user and 
		 * filters the smart table
		 *  @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		loadAORData: function () {
			// var oWorkListInstance = this;
			// call method loadSFCSettingsMenuOption from reuse library project to load the menu option
			if ((this.AssignedWorkcenter && this.AssignedWorkcenter !== null && this.AssignedWorkcenter
					.length > 0) || (this.AssignedSupervisor &&
					this.AssignedSupervisor !== null && this.AssignedSupervisor.length > 0)) {
				// pass true to the filter flag if AOR is already assigned
				AORReuse.loadSFCSettingsMenuOption(this, "i2d.mpe.Supervisor", true);
				this.bAORDeleted = false;
				this.bAORFilterFlag = true;

			} else {
				// pass false to the filter flag if AOR is not assigned
				this.bAORDeleted = true;
				this.bAORFilterFlag = false;
				AORReuse.loadSFCSettingsMenuOption(this, "i2d.mpe.Supervisor", false);
			}
		},

		/**
		 * Event handler when category multi combo selection finishd
		 * @param {sap.ui.base.Event} oEvent the multicombo selectionChange event
		 */
		onCategorySelectionFinish: function (oEvent) {
			var oControl = this.getView().byId("idSmartFilterBar");
			oControl.fireFilterChange(oEvent);
		},

		/** 
		 * Route matched handler of the view
		 * @param oEvent : event triggered when pattern in the URL is matched
		 * 
		 */
		handleRouteMatched: function (oEvent) {
			this.sAppState = oEvent.getParameter("arguments").iAppState;
			var sConfigName = oEvent.getParameter("config").name;
			this.getOwnerComponent().extractInnerAppStateFromURL(this.sAppState, sConfigName);
			var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
			var aProperties = ioAppStateModel.getProperty("/appState");
			aProperties.selectedOrderData = undefined;
			ioAppStateModel.setProperty("/appState", aProperties);
			this.getOwnerComponent().updateAppStateFromAppStateModel();
			var oOrderDetailModel = this.getView().getModel("DetailModel");
			var oOrderDetailData = oOrderDetailModel.getData();
			oOrderDetailData.selectedOrderData = undefined;
			oOrderDetailModel.setData(oOrderDetailData);
			this.getModel().setUseBatch(true);
			if (this._oErrorMessageToggleButton && this._oErrorMessageToggleButton.setVisible) {
				this._oErrorMessageToggleButton.setVisible(true);
			}
			var oDelayFunction = function (oController, oModel, oData) {
				oModel.setData(oData);
				oController._osmartTable.rebindTable();
			};
			if (oOrderDetailData.bReleasedSuccess) {
				oOrderDetailData.bReleasedSuccess = false;
				oDelayFunction(this, oOrderDetailModel, oOrderDetailData);
			} else if (oOrderDetailData.bHoldSuccess) {
				oOrderDetailData.bHoldSuccess = false;
				oDelayFunction(this, oOrderDetailModel, oOrderDetailData);
			}
		},

		/** 
		 * Application state handler, which updates and saves the application state in lrep.
		 * @param {object} oEvent - The channel of the event to subscribe to. 
		 * @param {object} oAppstate - The identifier of the event to listen for
		 * @param {object}  oData - Contains the oData which is saved in the Appstate model.
		 */
		handleAppStateChanges: function (oEvent, oAppstate, oData) {
			this._bInitialLoadFilterAppStateCheck = true;
			var oSmartFilterBar = this.getView().byId("idSmartFilterBar");
			if (oData.bDirtyFlag) {
				this._oVariantMgt.currentVariantSetModified(true);
			}
			if (oData.VariantState && oData.VariantState !== "") {
				oSmartFilterBar.setCurrentVariantId(oData.variantId);
				oSmartFilterBar.applyVariant(oData.VariantState);
			}
			var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
			if (oData.issuesFilter) {
				oSmartFilterBar.getControlByKey("CustomIssue").setSelectedKeys(oData.issuesFilter);
				ioAppStateModel.getProperty("/appState").issuesFilter = oData.issuesFilter;
			}
			if (oData.delayFilter || oData.delayFilter === "") {
				oSmartFilterBar.getControlByKey("CustomDelay").setSelectedKey(oData.delayFilter);
				ioAppStateModel.getProperty("/appState").delayFilter = oData.delayFilter;
			}
			if (oData.statusFilter) {
				oSmartFilterBar.getControlByKey("CustomStatus").setSelectedKeys(oData.statusFilter);
				ioAppStateModel.getProperty("/appState").statusFilter = oData.statusFilter;
			}
			var oSmartTableContent = JSON.parse(oData.VariantTableState);
			ioAppStateModel.getProperty("/appState").VariantTableState = oData.VariantTableState;
			if (this._osmartTable.getTable() && this._osmartTable.getTable().getShowOverlay()) {
				if (oSmartTableContent && oSmartTableContent.columns && (oData.variantId === "" || oData.bDirtyFlag)) {
					this._osmartTable.applyVariant(oSmartTableContent);
				} else {
					this._osmartTable.rebindTable();
				}
			} else {
				if (oSmartTableContent && oSmartTableContent.columns && (oData.variantId === "" || oData.bDirtyFlag)) {
					this._osmartTable.applyVariant(oSmartTableContent);
				}
			}
			this.getOwnerComponent().updateAppStateFromAppStateModel();
		},

		/** 
		 * Updates the app state, with the values of the variant.
		 * @param {object} oEvent The Event information to get the binding context path
		 */
		handleAppstateUpdate: function (oEvent) {
			var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
			var aProperties = ioAppStateModel.getProperty("/appState");
			aProperties.variantId = oEvent.getSource().getCurrentVariantId();
			aProperties.VariantState = oEvent.getSource().fetchVariant();
			aProperties.bDirtyFlag = this._oVariantMgt.currentVariantGetModified();
			ioAppStateModel.setProperty("/appState", aProperties);
			this.getOwnerComponent().updateAppStateFromAppStateModel();
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		/*
		 * On click of the Order Item
		 * Navigate to the detail page , to display the Order details
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 * @param oEvent to get the binding context path
		 */
		handleOrderSelection: function (oEvent) {
			// var sOrderPath = oEvent.getParameter("listItem").getBindingContextPath();
			// var sOrderId = sOrderPath.substr(1);
			// this.updateOrderDetailModel(sOrderId);
			// this.getRouter().navTo("object", {
			// 	orderId: sOrderId,
			// 	iAppState: this.sAppState
			// }, false);

			var sOrderPath = oEvent.getParameter("listItem").getBindingContextPath();
			var sOrderId = sOrderPath.substr(1);
			this.updateOrderDetailModel(sOrderId);
			var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
			var aProperties = ioAppStateModel.getProperty("/appState");
			aProperties.selectedOrderData = this.getView().getModel().getProperty(sOrderPath);
			ioAppStateModel.setProperty("/appState", aProperties);
			this.getOwnerComponent().updateAppStateFromAppStateModel();
			WorklistHelper.handleOrderSelection(this.getRouter(), "object", sOrderId, this.sAppState);
		},

		/**
		 * Triggered when any item is pressed of smart table . This method reads the current order id and updates the detail model.
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 * @param {string} sOrderId of the selected order
		 */
		updateOrderDetailModel: function (sOrderId) {
			// var oOrderDetailModel = this.getView().getModel("DetailModel");
			// var oOrderDetailData = oOrderDetailModel.getData();
			// oOrderDetailData.orderId = sOrderId;
			// oOrderDetailModel.setData(oOrderDetailData);

			var oOrderDetailModel = this.getView().getModel("DetailModel");
			var oOrderDetailData = oOrderDetailModel.getData();
			oOrderDetailData.orderId = sOrderId;
			oOrderDetailData.selectedOrderData = this.getView().getModel().getProperty("/" + sOrderId);

			WorklistHelper.updateOrderDetailModel(oOrderDetailModel, oOrderDetailData);
		},

		/** 
		 * Filter Change event handler
		 * @param oEvent
		 *  @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleFilterChange: function (oEvent) {
			//Update Appstate on change of filter.
			this.handleAppstateUpdate(oEvent);
		},

		/**
		 * Triggered when each row check box is clicked on
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleTableItemSelection: function (oEvent) {
			var aTableListItems = oEvent.getSource().getSelectedItems();
			var oItem,
				bReleasedFlag,
				bRereadAllowed,
				bIsQuantityDateChangeAllowed,
				bIsHoldVisible,
				bIsEditVisible;

			if (aTableListItems.length === 0) {
				bReleasedFlag = false;
				bRereadAllowed = false;
				bIsQuantityDateChangeAllowed = false;
				bIsHoldVisible = false;
				bIsEditVisible = false;
			} else {
				bReleasedFlag = true;
				bRereadAllowed = true;
				bIsQuantityDateChangeAllowed = true;
				bIsHoldVisible = true;
				bIsEditVisible = true;
				for (var i = 0; i < aTableListItems.length; i++) {
					oItem = aTableListItems[i].getBindingContext().getObject();

					// Check if an order can be released
					bReleasedFlag = (bReleasedFlag && (oItem.OrderIsCreated === "X" || oItem.OrderIsPartiallyReleased === "X") &&
						oItem.OrderIsReleased === "");

					// Check if PP master data can be read
					bRereadAllowed = (bRereadAllowed && oItem.OrderIsCreated === "X");

					// Check if date or quantity of an order can be changed
					bIsQuantityDateChangeAllowed = (bIsQuantityDateChangeAllowed && formatter.getButtonStatus(oItem));

					// Check if hold is available (also order change)
					bIsHoldVisible = (bIsHoldVisible &&
						formatter.getButtonStatus(oItem) &&
						oItem.ManufacturingFeature === "EPO" &&
						oItem.ManufacturingFeatureIsActive === "X" &&
						oItem.OrderIsShopFloorOrder === "X");

					// Check if Edit is available (edit only works for non-MPE orders)
					bIsEditVisible = (bIsEditVisible && oItem.OrderIsShopFloorOrder === "");
				}
			}
			this.getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", bReleasedFlag);
			this.getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", bRereadAllowed);
			this.getModel("ActionButtonVisiblity").setProperty("/HoldButtonVisible", bIsHoldVisible);

			if (aTableListItems.length > 1 || aTableListItems.length === 0) {
				this.getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
				this.getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
				this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
				this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
			} else {
				this.getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", bIsQuantityDateChangeAllowed);
				this.getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", bIsEditVisible);

				//If order is an MPE order and has all conditions of status met (hold and order change condiditons are same)
				if (bIsHoldVisible) {

					//Check of order has an existing order change
					ReuseUtil.checkOprHasOpenOrdSpcfcChange(this.getModel("OSR"), oItem, function (oData) {
						this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", true);
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
						this.getModel("worklistView").setProperty("/oOrderSpecificChangeDetails", oData.results[0]);
					}.bind(this));
				} else {
					this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
					this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
				}
			}
		},

		/**
		 * Triggered when Release button is clicked on
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleReleaseButton: function (oEvent) {
			var aTableListItems = this._osmartTable.getTable().getSelectedItems();
			//the refresh in the next line is done to get for sure new data on the 
			//production order popover for the status and the current-/ next operation after 
			//the Release Button is triggerd otherwise there is different data on the 
			//worklist and the popover shown if the popover is already opened before  
			//the mentioned button is triggered because data is stored in memory
			this.getModel("PRODORD").refresh(false, true);
			var oLocalModel = this.getView().getModel();
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			this._oMessageManager.removeAllMessages();
			this._oErrorMessageToggleButton.setVisible(true);
			WorklistHelper.handleReleaseButton(aTableListItems, oLocalModel, bCompact, this.getView().getModel("ActionButtonVisiblity"));
			// adding event bus for release anyway functionality
			var oEventBus = sap.ui.getCore().getEventBus();
			var oEventBusParams = this.getEventBusParameters();
			WorklistHelper.setEventBusParameters(oEventBus, oEventBusParams.ReleaseOrderAnyway.Channel,
				oEventBusParams.ReleaseOrderAnyway.Event);
		},

		/**
		 * Triggered when Edit Qty and Date button is clicked on
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleEditQtyAndDateButton: function (oEvent) {
			var aItems = this._osmartTable.getTable().getSelectedItems();
			var sPath = aItems[0].getBindingContext().sPath;

			// var aEditQtyAndDateObjectArray = [];
			for (var iCount = 0; iCount < aItems.length; iCount++) {
				var sPath = aItems[iCount].getBindingContext().sPath;
				var sOrder = aItems[iCount].getBindingContext().oModel.getProperty(sPath).ManufacturingOrder;
				var sPlannedTotalQty = aItems[iCount].getBindingContext().oModel.getProperty(sPath).MfgOrderPlannedTotalQty;
				var sPlannedScrapQty = aItems[iCount].getBindingContext().oModel.getProperty(sPath).MfgOrderPlannedScrapQty;
				var sProductionUnit = aItems[iCount].getBindingContext().oModel.getProperty(sPath).ProductionUnit;
				var sPlannedStartDate = aItems[iCount].getBindingContext().oModel.getProperty(sPath).MfgOrderPlannedStartDate;
				var sPlannedStartTime = aItems[iCount].getBindingContext().oModel.getProperty(sPath).MfgOrderPlannedStartTime;
				var sPlannedEndDate = aItems[iCount].getBindingContext().oModel.getProperty(sPath).MfgOrderPlannedEndDate;
				var sPlannedEndTime = aItems[iCount].getBindingContext().oModel.getProperty(sPath).MfgOrderPlannedEndTime;
				var sSchedulingType = aItems[iCount].getBindingContext().oModel.getProperty(sPath).BasicSchedulingType;
				var sSchedulingTypeName = aItems[iCount].getBindingContext().oModel.getProperty(sPath).SchedulingTypeName;
				//deactivated solution for DateTimePicker
				// var oFormattedDateTime = commonFormatter.formatDateTimePicker(sPlannedStartDate, sPlannedStartTime);

				var oEditQtyAndDateObject = {
					ManufacturingOrder: sOrder,
					MfgOrderPlannedTotalQty: sPlannedTotalQty,
					MfgOrderPlannedScrapQty: sPlannedScrapQty,
					ProductionUnit: sProductionUnit,
					MfgOrderPlannedStartDate: sPlannedStartDate,
					//deactivated solution for DateTimePicker
					// MfgOrderPlannedStartDate: oFormattedDateTime,
					MfgOrderPlannedStartTime: sPlannedStartTime,
					MfgOrderPlannedEndDate: sPlannedEndDate,
					MfgOrderPlannedEndTime: sPlannedEndTime,
					BasicSchedulingType: sSchedulingType,
					SchedulingTypeName: sSchedulingTypeName
				};

				// aEditQtyAndDateObjectArray.push(oEditQtyAndDateObject);
			}

			// EditQtyAndDateDialog.initAndOpen(oEditQtyAndDateObject, this.getModel("EditQtyAndDate"), aEditQtyAndDateObjectArray);
			EditQtyAndDateDialog.initAndOpen(oEditQtyAndDateObject, this.getModel(), sPath);

			// Set parameters for event bus
			var oEventBusParams = this.getEventBusParameters();
			var oEventBus = sap.ui.getCore().getEventBus();
			EditQtyAndDateDialog.setEventBusParameters(oEventBus, oEventBusParams.EditQtyAndDateDialog.Channel,
				oEventBusParams.EditQtyAndDateDialog.Event);
		},

		/**
		 * Triggered when Hold button is clicked on
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleHoldButton: function (oEvent) {
			var aItems = this._osmartTable.getTable().getSelectedItems();
			var sPath = aItems[0].getBindingContext().sPath;
			var sOrder = aItems[0].getBindingContext().oModel.getProperty(sPath).ManufacturingOrder;
			var sMaterial = aItems[0].getBindingContext().oModel.getProperty(sPath).Material;
			var sPlant = aItems[0].getBindingContext().oModel.getProperty(sPath).ProductionPlant;

			var aHoldObjectArray = [];
			for (var iCount = 0; iCount < aItems.length; iCount++) {
				var sPath = aItems[iCount].getBindingContext().sPath;
				var sOrder = aItems[iCount].getBindingContext().oModel.getProperty(sPath).ManufacturingOrder;
				var sMaterial = aItems[iCount].getBindingContext().oModel.getProperty(sPath).Material;
				var sPlant = aItems[iCount].getBindingContext().oModel.getProperty(sPath).ProductionPlant;
				// var sWorkCenter = aItems[iCount].getBindingContext().oModel.getProperty(sPath).WorkCenter;
				var sOrderOperationInternalID = aItems[iCount].getBindingContext().oModel.getProperty(sPath).OrderOperationInternalID;
				var sOrderInternalBillOfOperations = sPath.substring(51, 61);
				var sOrderIntBilOfOperationsItem = sPath.substring(93, 101);
				var oHoldObject = {
					ManufacturingOrder: sOrder,
					ProductionPlant: sPlant,
					Material: sMaterial,
					OrderOperationInternalID: "",
					WorkCenter: "",
					OrderInternalID: "",
					ShopFloorItem: 0

				};
				aHoldObjectArray.push(oHoldObject);
			}
			// Check, if order is Shop Floor Order. If not only material allowed
			var aHoldTypesRequired = [ReuseProjectConstants.HOLD.TYPE_ORDER, ReuseProjectConstants.HOLD.TYPE_MATERIAL];
			ApplyHoldDialog.initAndOpen(oHoldObject, this.getModel("HoldModel"), aHoldTypesRequired, aHoldObjectArray, ReuseProjectConstants.HOLD
				.TYPE_ORDER, false);

			// Set parameters for event bus
			var oEventBusParams = this.getEventBusParameters();
			var oEventBus = sap.ui.getCore().getEventBus();
			ApplyHoldDialog.setEventBusParameters(oEventBus, oEventBusParams.ApplyHoldDialog.Channel,
				oEventBusParams.ApplyHoldDialog.Event);
		},

		getEventBusParameters: function () {
			// define events' details here for which event bus will be subscribed
			var oEventBusParams = {
				ApplyHoldDialog: {
					Channel: "sap.i2d.mpe.orders.manages2",
					Event: "onHoldSuccessfullyApplied",
					Callback: this.onHoldSuccessfullyComplete
				},
				EditQtyAndDateDialog: {
					Channel: "sap.i2d.mpe.orders.manages2",
					Event: "onEditQtyAndDateSuccessfullyApplied",
					Callback: this.onEditQtyAndDateSuccessfullyComplete
				},
				ReleaseOrderAnyway: {
					Channel: "sap.i2d.mpe.orders.manages2",
					Event: "onReleaseOrderAnywayApplied",
					Callback: this.onReleaseOrderAnywayCallback
				}
			};
			return oEventBusParams;
		},

		onReleaseOrderAnywayCallback: function (sChannelId, sEventId, oResponse) {

			var aTableListItems = this.getView().byId("idMonitorOrdersTable").getTable().getSelectedItems();
			//the refresh in the next line is done to get for sure new data on the 
			//production order popover for the status and the current-/ next operation after 
			//the Release Button is triggerd otherwise there is different data on the 
			//worklist and the popover shown if the popover is already opened before  
			//the mentioned button is triggered because data is stored in memory
			this.getModel("PRODORD").refresh(false, true);
			var oLocalModel = this.getView().getModel();
			// var oGlobalLocalModel = new sap.ui.model.json.JSONModel(oLocalModel);
			// this.setModel(oGlobalLocalModel, "globalModel");

			//sap.ui.getCore().setModel(oGlobalLocalModel, "globalModel");
			if (this.getView().$) {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			}
			this._oMessageManager.removeAllMessages();
			this._oErrorMessageToggleButton.setVisible(true);
			WorklistHelper.handleReleaseButton(aTableListItems, oLocalModel, bCompact, this.getView().getModel("ActionButtonVisiblity"), true);

		},

		onHoldSuccessfullyComplete: function (sChannelId, sEventId, oResponse) {
			var sMessageText, sFinalText;
			var aTableItems = this.getView().byId("idMonitorOrdersTable").getTable().getSelectedItems();
			if (oResponse.success) {
				sMessageText = oResponse.info;
				sFinalText = oResponse.detail;
				MessageToast.show(sMessageText);
				for (var i = 0; i < aTableItems.length; i++) {
					aTableItems[i].setSelected(false);
				}
				this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/HoldButtonVisible", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
				this._osmartTable.rebindTable();
			} else {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				sMessageText = oResponse.info;
				this.getDynamicMessageBox(sMessageText, MessageBox.Icon.ERROR, "Error", [MessageBox.Action.CLOSE], this.getI18NText("ErrorOrderMSG"), sFinalText,
					bCompact);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/HoldButtonVisible", true);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
			}
		},

		onEditQtyAndDateSuccessfullyComplete: function (sChannelId, sEventId, oResponse) {
			var sMessageText, sFinalText;
			var aTableItems = this.getView().byId("idMonitorOrdersTable").getTable().getSelectedItems();
			if (oResponse.success) {
				if ((oResponse.info) || (oResponse.detail)) {
					this._osmartTable.rebindTable();
					sMessageText = oResponse.info;
					sFinalText = oResponse.detail;
					MessageToast.show(sMessageText);
					for (var i = 0; i < aTableItems.length; i++) {
						aTableItems[i].setSelected(false);
					}
				}
				this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
			} else {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				sMessageText = oResponse.info;
				sFinalText = oResponse.detail;
				this.getDynamicMessageBox(sMessageText, MessageBox.Icon.ERROR, this.getI18NText("ErrorPopupTitle"), [MessageBox.Action.CLOSE],
					this.getI18NText("ErrorOrderMSG"), sFinalText,
					bCompact);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", true);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
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

			WorklistHelper.getDynamicMessageBox(sMessageText, icon, stitle, actions, id, sFinalText, bCompact);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 *  @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		onPress: function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/** 
		 * Gives i18n text, corresponding to the key and parameters passed.
		 * @param isKey
		 * @param aValues
		 * @returns
		 */
		getI18NText: function (isKey, aValues) {
			// return this.getResourceBundle().getText(isKey, aValues);

			return WorklistHelper.getI18NText(isKey, aValues);
		},

		/**
		 * Saving a variant as tile
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 * @param {object} oEvent
		 */
		handleSaveVariant: function (oEvent) {
			TileManagement.saveVariantAsTile(oEvent, this, "idMonitorOrdersTable");
		},

		/** 
		 * Sets the custom filters data into the custom model 
		 */
		setCustomFiltersData: function () {
			var loData = {};

			//set the values for issues filter
			loData.issues = [{
					id: "All",
					name: this.getI18NText("AllIssues")
				}, {
					id: "Delay",
					name: this.getI18NText("Delay")
				}, {
					id: "ComponentIssue",
					name: this.getI18NText("ComponentIssue")
				},
				/*{
				id: "ToolIssue",
				name: this.getI18NText("ToolIssue")
			},*/
				{
					id: "QuantityIssue",
					name: this.getI18NText("QuantityIssue")
				}, {
					id: "QualityIssue",
					name: this.getI18NText("QualityIssue")
				}, {
					id: "ProductionHold",
					name: this.getI18NText("ProductionHold")
				}
			];

			//set the values for delay duration filter
			loData.delay = [{
				key: "",
				value: this.getI18NText("equalorgreater_0hr")
			}, {
				key: "1",
				value: this.getI18NText("greater_1hr")
			}, {
				key: "2",
				value: this.getI18NText("greater_2hr")
			}, {
				key: "5",
				value: this.getI18NText("greater_5hr")
			}, {
				key: "12",
				value: this.getI18NText("greater_12hr")
			}, {
				key: "24",
				value: this.getI18NText("greater_1day")
			}, {
				key: "48",
				value: this.getI18NText("greater_2day")
			}];
			//set the values for status filters
			loData.status = [{
				id: "All",
				name: this.getI18NText("AllStatus")
			}, {
				id: "1",
				name: this.getI18NText("status_created")
			}, {
				id: "2",
				name: this.getI18NText("status_partReleased")
			}, {
				id: "3",
				name: this.getI18NText("status_released")
			}, {
				id: "4",
				name: this.getI18NText("status_tobedeleted")
			}, {
				id: "5",
				name: this.getI18NText("status_partConfirmed")
			}, {
				id: "6",
				name: this.getI18NText("status_confirmed")
			}, {
				id: "7",
				name: this.getI18NText("status_partdelivered")
			}, {
				id: "8",
				name: this.getI18NText("status_delivered")
			}, {
				id: "9",
				name: this.getI18NText("status_locked")
			}, {
				id: "10",
				name: this.getI18NText("status_techCompleted")
			}, {
				id: "11",
				name: this.getI18NText("status_closed")
			}, {
				id: "12",
				name: this.getI18NText("status_deleted")
			}];
			var loCustomFilterModel = new JSONModel(loData);
			this.getView().setModel(loCustomFilterModel, "customFiltersModel");
		},

		/** 
		 * Event handler of issue selection chage.
		 * Selection and Deselection functionality of the options.
		 * Also updates the AppState.
		 *  @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @param oEvent
		 * @public
		 */
		handleIssueSelectionChange: function (oEvent) {
			var aSelectedKeys = oEvent.getSource().getProperty("selectedKeys");
			this.handleMultiSelectionWithAllOption(oEvent);
			this.updateAppStateforCustomFilters(aSelectedKeys, "issuesFilter");
			var onHandSelectedItems = oEvent.getSource().getSelectedItems();
			if (onHandSelectedItems.length > 0) {
				oEvent.getSource().data("hasValue", true);
			} else {
				oEvent.getSource().data("hasValue", false);
			}
		},

		/** 
		 * Event handler of Delay filter
		 * Also updates the AppState.
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @param oEvent
		 * @public
		 */
		handleDelaySelectionChange: function (oEvent) {
			var loSource = oEvent.getSource();
			var aSelectedKeys = loSource.getSelectedKey();
			this.updateAppStateforCustomFilters(aSelectedKeys, "delayFilter");
		},

		/** 
		 * Event handler of Status Selection change.
		 *  Also updates the AppState.
		 *  @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @param oEvent
		 * @public
		 */
		handleStatusSelectionChange: function (oEvent) {
			var aSelectedKeys = oEvent.getSource().getProperty("selectedKeys");
			this.handleMultiSelectionWithAllOption(oEvent);
			this.updateAppStateforCustomFilters(aSelectedKeys, "statusFilter");
			var onHandSelectedItems = oEvent.getSource().getSelectedItems();
			if (onHandSelectedItems.length > 0) {
				oEvent.getSource().data("hasValue", true);
			} else {
				oEvent.getSource().data("hasValue", false);
			}
		},

		/** 
		 * Handles Multi selection in the Status filters.
		 *  @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @param oEvent
		 * @public
		 */
		handleMultiSelectionWithAllOption: function (oEvent) {
			var loSource = oEvent.getSource();
			var sSelectedKey = oEvent.getParameter("changedItem").getProperty("key");
			var aSelectedKeys = loSource.getProperty("selectedKeys");
			if (sSelectedKey && (sSelectedKey === "All") && (oEvent.getParameter("selected"))) {
				//Select All
				loSource.setSelectedItems(loSource.getItems());
			} else if (sSelectedKey && (sSelectedKey === "All") && (!oEvent.getParameter("selected"))) {
				// UnSelect All
				loSource.setSelectedItems([]);
			} else {
				if (aSelectedKeys.indexOf("All") !== -1) {
					//If user select All and then deselect Any of the options apart from 'All', then Deselect 'All' option
					aSelectedKeys.splice(aSelectedKeys.indexOf("All"), 1);
					loSource.setSelectedKeys(aSelectedKeys);
				} else {
					var iNoOfItems = loSource.getItems().length;
					var iNoOfSelectedItems = aSelectedKeys.length;
					var iDelta = iNoOfItems - iNoOfSelectedItems;
					if (iDelta === 1) {
						//if User Selects All the Options apart from the 'All', then select all options
						loSource.setSelectedItems(loSource.getItems());
					}
				}
			}
		},

		/** 
		 * updates the app state for Custom Filters
		 * @param sKey
		 * @param sCustomName
		 */
		updateAppStateforCustomFilters: function (sKey, sCustomName) {
			var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
			ioAppStateModel.getProperty("/appState")[sCustomName] = sKey;
			this.getOwnerComponent().updateAppStateFromAppStateModel();
		},

		/** 
		 * Event handler of smart table rebind.
		 * Applies filters on smart table based on the AOR and Custom filters.
		 *  @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @param oEvent
		 * @public
		 */
		handleBeforeRebindTable: function (oEvent) {
			this.sAORFilterString = "";
			var mBindingParams = oEvent.getParameter("bindingParams");
			//get additional data from the backend for the edit quantity and date popup
			mBindingParams.parameters.select = mBindingParams.parameters.select + ",MfgOrderPlannedScrapQty";
			mBindingParams.parameters.select = mBindingParams.parameters.select + ",MfgOrderPlannedStartDate";
			mBindingParams.parameters.select = mBindingParams.parameters.select + ",MfgOrderPlannedStartTime";
			mBindingParams.parameters.select = mBindingParams.parameters.select + ",MfgOrderPlannedEndDate";
			mBindingParams.parameters.select = mBindingParams.parameters.select + ",MfgOrderPlannedEndTime";
			mBindingParams.parameters.select = mBindingParams.parameters.select + ",BasicSchedulingType";
			mBindingParams.parameters.select = mBindingParams.parameters.select + ",SchedulingTypeName";
			mBindingParams.preventTableBind = false;
			this.ChangeSTableNoDataText();
			if (!this.bAORFilterFlag) {
				mBindingParams.preventTableBind = true;
				return;
			}
			var aTableFilter = mBindingParams.filters;
			var aTableSorter = mBindingParams.sorter;

			if (mBindingParams.sorter[0] === undefined) {
				//by default sorter when app starts
				var aStatusSorter = new sap.ui.model.Sorter("OrderStatusInternalID", true);
				aTableSorter.push(aStatusSorter);
				var aStartDateSorter = new sap.ui.model.Sorter("OrderStartDate", true);
				aTableSorter.push(aStartDateSorter);
				var aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderScheduledStartTime", true);
				aTableSorter.push(aStartTimeSorter);
				var aStartTimeSorterActual = new sap.ui.model.Sorter("MfgOrderActualStartTime", true);
				aTableSorter.push(aStartTimeSorterActual);
			}
			//use this sorter if user provides default sorting
			else if (mBindingParams.sorter[0] !== undefined) {
				var aFilter = mBindingParams.sorter[0].sPath;
				var aUserDefinedSorter = new sap.ui.model.Sorter(aFilter, true);
				aTableSorter.push(aUserDefinedSorter);
				var aStartTimeSorter;
				if (aFilter === "MfgOrderScheduledStartDate") {
					if (mBindingParams.sorter[0].bDescending === true) {
						aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderScheduledStartTime", true);
						aTableSorter.push(aStartTimeSorter);
					} else if (mBindingParams.sorter[0].bDescending === false) {
						aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderScheduledStartTime", false);
						aTableSorter.push(aStartTimeSorter);
					}
				} else if (aFilter === "MfgOrderActualStartDate") {
					if (mBindingParams.sorter[0].bDescending === true) {
						aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderActualStartTime", true);
						aTableSorter.push(aStartTimeSorter);
					} else if (mBindingParams.sorter[0].bDescending === false) {
						aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderActualStartTime", false);
						aTableSorter.push(aStartTimeSorter);
					}
				} else if (aFilter === "MfgOrderScheduledEndDate") {
					if (mBindingParams.sorter[0].bDescending === true) {
						aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderScheduledEndTime", true);
						aTableSorter.push(aStartTimeSorter);
					} else if (mBindingParams.sorter[0].bDescending === false) {
						aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderScheduledEndTime", false);
						aTableSorter.push(aStartTimeSorter);
					}
				} else if (aFilter === "MfgOrderConfirmedEndDate") {
					if (mBindingParams.sorter[0].bDescending === true) {
						aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderConfirmedEndTime", true);
						aTableSorter.push(aStartTimeSorter);
					} else if (mBindingParams.sorter[0].bDescending === false) {
						aStartTimeSorter = new sap.ui.model.Sorter("MfgOrderConfirmedEndTime", false);
						aTableSorter.push(aStartTimeSorter);
					}
				}

			}

			// applying filter based on the aor
			var oFilterAOR = AORReuse.updateAORFilters(this);
			// applying filter based on the selected issue custom filter
			var oFilterIssue = this.updateIssueCustomFilter();
			// applying filter based on the selected delay custom filter
			var oFilterDelay = this.updateDelayFilter();
			// applying filter based on the selected status custom filter
			if (this.bAssignDefaultStatusFilter) {
				var aPreSelectedKeys = ["1", "2", "3", "5", "6", "7", "8"];
				var oCustomStatusFilters = this._oSmartFilter.getControlByKey("CustomStatus");
				if (this.getOwnerComponent() && this.getOwnerComponent().getModel("AppState") && this._bInitialLoadFilterAppStateCheck === true) {
					var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
					if (ioAppStateModel.getProperty("/appState").statusFilter && ioAppStateModel.getProperty("/appState").statusFilter.length > 0) {
						aPreSelectedKeys = ioAppStateModel.getProperty("/appState").statusFilter;
						this._bInitialLoadFilterAppStateCheck = false;
					} else {
						this._bInitialLoadFilterAppStateCheck = false;
					}
				}
				if (this._oVariantMgt.getCurrentVariantId() !== "") {
					var oData = this._oSmartFilter.getFilterData();
					if (oData) {
						var oCustomFieldData = oData["_CUSTOM"];
						if (oCustomFieldData) {
							if (oCustomFieldData.Status) {
								aPreSelectedKeys = oCustomFieldData.Status;
							}
						}
					}
				}
				if (oCustomStatusFilters) {
					oCustomStatusFilters.setSelectedKeys(aPreSelectedKeys);
				} else {
					this.getView().byId("idCustomStatusMultiSelectBox").setSelectedKeys(aPreSelectedKeys);
				}
				this.bAssignDefaultStatusFilter = false;
			}

			var oSelectedFilterStatus = this.updateStatusFilter();

			var oFilterCombination = new sap.ui.model.Filter([], true);
			if (oFilterDelay.aFilters.length > 0) {
				oFilterCombination.aFilters.push(oFilterDelay);
			}
			if (oFilterIssue.aFilters.length > 0) {
				oFilterCombination.aFilters.push(oFilterIssue);
			}
			if (oSelectedFilterStatus.aFilters.length > 0) {
				oFilterCombination.aFilters.push(oSelectedFilterStatus);
			}
			var oODataModel = this.getOwnerComponent().getModel();
			if (oFilterAOR.aFilters.length > 0 && oODataModel && oODataModel.getServiceMetadata()) {
				var vMetadata = oODataModel.oMetadata;
				var oEntityTypeArray = oODataModel.getServiceMetadata().dataServices.schema[0].entityType;
				var oEntityType = "";
				for (var iCount = 0; iCount < oEntityTypeArray.length; iCount++) {
					if (oODataModel.getServiceMetadata().dataServices.schema[0].entityType[iCount].name === "C_ManageProductionOrderType") {
						oEntityType = oODataModel.getServiceMetadata().dataServices.schema[0].entityType[iCount];
					}
				}
				this.sAORFilterString = sap.ui.model.odata.ODataUtils.createFilterParams(oFilterAOR, vMetadata, oEntityType);

				this.sAORFilterString = this.sAORFilterString.replace("$filter=", "");
				oFilterCombination.aFilters.push(oFilterAOR);
			}

			if (aTableFilter[0] && aTableFilter[0].aFilters) {
				var oSmartTableMultiFilter = aTableFilter[0];
				// if an internal multi-filter exists then combine custom multi-filters and internal multi-filters with an AND
				aTableFilter[0] = new sap.ui.model.Filter([oSmartTableMultiFilter, oFilterCombination], true);

			} else {
				aTableFilter.push(oFilterCombination);
			}
			// this._callHandleAppStateUpdate();
		},

		/**
		 * Used to calculate the Status custom filters. 
		 * @memberOf i2d.mpe.operations.manages2.controller.Worklist
		 * @public
		 * @return {object}  : The selected status Filters
		 */
		updateStatusFilter: function () {
			// applying filter based on the selected status custom filter
			var oFilterStatus = new sap.ui.model.Filter([], false);
			var oSelectedStatus = [];
			if (this._oSmartFilter.getControlByKey("CustomStatus")) {
				oSelectedStatus = this._oSmartFilter.getControlByKey("CustomStatus").getSelectedKeys();
			} else {
				oSelectedStatus = this.getView().byId("idCustomStatusMultiSelectBox").getSelectedKeys();
			}

			for (var i = 0; oSelectedStatus.length > i; i++) {
				if (oSelectedStatus[i]) {
					if (oSelectedStatus[i] !== "All") {
						oFilterStatus.aFilters.push(new sap.ui.model.Filter("OrderStatusInternalID", sap.ui.model.FilterOperator.EQ,
							oSelectedStatus[i]));

					}
				}
			}
			return oFilterStatus;
		},

		/**
		 * Used to calculate the Issue Filter array. 
		 * @memberOf i2d.mpe.operations.manages2.controller.Worklist
		 * @public
		 * @return {object}  : The selected Issues Filters
		 */
		updateIssueCustomFilter: function () {
			var oFilterIssue = new sap.ui.model.Filter([], false);
			var oSelectedIssues = [];
			if (this._oSmartFilter.getControlByKey("CustomIssue")) {
				oSelectedIssues = this._oSmartFilter.getControlByKey("CustomIssue").getSelectedKeys();
			}
			for (var iIssueCount = 0; oSelectedIssues.length > iIssueCount; iIssueCount++) {
				if (oSelectedIssues[iIssueCount]) {
					if (oSelectedIssues[iIssueCount] === "Delay" || oSelectedIssues[iIssueCount] === "All") {
						oFilterIssue.aFilters.push(new sap.ui.model.Filter("OrderExecutionStartIsLate", sap.ui.model.FilterOperator.Contains, "X"));
						oFilterIssue.aFilters.push(new sap.ui.model.Filter("OrderExecutionEndIsLate", sap.ui.model.FilterOperator.Contains, "X"));
					} else if (oSelectedIssues[iIssueCount] === "QuantityIssue" || oSelectedIssues[iIssueCount] === "All") {
						oFilterIssue.aFilters.push(new sap.ui.model.Filter("OrderYieldDeviationQty", sap.ui.model.FilterOperator.LT, 0));
					} else if (oSelectedIssues[iIssueCount] === "ComponentIssue" || oSelectedIssues[iIssueCount] === "All") {
						oFilterIssue.aFilters.push(new sap.ui.model.Filter("OrderHasMissingComponents", sap.ui.model.FilterOperator.Contains, "X"));
					} else if (oSelectedIssues[iIssueCount] === "QualityIssue" || oSelectedIssues[iIssueCount] === "All") {
						oFilterIssue.aFilters.push(new Filter("OrderHasQualityIssue", sap.ui.model.FilterOperator.Contains, "X"));
						oFilterIssue.aFilters.push(new Filter("InspHasRejectedCharc", sap.ui.model.FilterOperator.Contains, "X"));
						oFilterIssue.aFilters.push(new Filter("InspHasRejectedInspSubset", sap.ui.model.FilterOperator.Contains, "X"));
						oFilterIssue.aFilters.push(new Filter("InspHasRejectedInspLot", sap.ui.model.FilterOperator.Contains, "X"));
					} else if (oSelectedIssues[iIssueCount] === "ProductionHold" || oSelectedIssues[iIssueCount] === "All") {
						oFilterIssue.aFilters.push(new sap.ui.model.Filter("OrderHasProductionHold", sap.ui.model.FilterOperator.Contains, "X"));
					}
				}
			}
			return oFilterIssue;
		},

		/**
		 * Used to calculate the Delay Filter array. 
		 * @memberOf i2d.mpe.operations.manages2.controller.Worklist
		 * @public
		 * @return {object}  : The selected Delay Filters
		 */
		updateDelayFilter: function () {
			var oSelectedDelay = [];
			if (this._oSmartFilter.getControlByKey("CustomDelay")) {
				oSelectedDelay = this._oSmartFilter.getControlByKey("CustomDelay").getSelectedKey();
			}
			var oFilterDelay = new sap.ui.model.Filter([], false);
			if (oSelectedDelay && oSelectedDelay.length > 0) {
				oFilterDelay.aFilters.push(new sap.ui.model.Filter("ExecutionEndLatenessInHours", sap.ui.model.FilterOperator.GT, oSelectedDelay));
				oFilterDelay.aFilters.push(new sap.ui.model.Filter("ExecutionStartLatenessInHours", sap.ui.model.FilterOperator.GT, oSelectedDelay));
			}
			return oFilterDelay;
		},

		/**
		 * Triggered when the Variant is fetched in the SmartFilterBar. The list of Variants is set here
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleVariantFetch: function () {
			var oVariantMgt = this.byId("idSmartVManagement");
			var aVariants = oVariantMgt.getVariantItems();
			var sVariantName = null;
			var sVariantKey = null;
			var aVariantNames = [];
			if (aVariants.length > 0) {
				for (var iCount = 0; iCount < aVariants.length; iCount++) {
					sVariantKey = aVariants[iCount].getKey();
					sVariantName = aVariants[iCount].getText();
					var oVariants = {
						vKey: sVariantKey,
						vName: sVariantName
					};
					aVariantNames.push(oVariants);
				}
			}
			this._aVariants = aVariantNames;
		},

		/**
		 * Triggered when the Variant is loaded in the SmartFilterBar. This method reads _CUSTOM data of the variant and sets to the respective custom filter
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleVariantLoad: function () {
			var oData = this._oSmartFilter.getFilterData();
			if (oData) {
				var oCustomFieldData = oData["_CUSTOM"];
				if (oCustomFieldData) {
					if (oCustomFieldData.Issues) {
						this._oSmartFilter.getControlByKey("CustomIssue").setSelectedKeys(oCustomFieldData.Issues);
					} else {
						this._oSmartFilter.getControlByKey("CustomIssue").setSelectedKeys([]);
					}
					if (oCustomFieldData.Delay) {
						this._oSmartFilter.getControlByKey("CustomDelay").setSelectedKey(oCustomFieldData.Delay);
					} else {
						this._oSmartFilter.getControlByKey("CustomDelay").setSelectedKey("");
					}
					if (oCustomFieldData.Status) {

						this._oSmartFilter.getControlByKey("CustomStatus").setSelectedKeys(oCustomFieldData.Status);
					} else {
						this._oSmartFilter.getControlByKey("CustomStatus").setSelectedKeys([]);
					}
				}
			}
			if (this._oVariantMgt.getCurrentVariantId() === "") {
				this.bAssignDefaultStatusFilter = true;
			}
		},

		/** 
		 * Event before variant save.
		 * modifies the custom parameter with all filters applied, which can be used later by smart filer bar.
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 * @param {object} oEvent action data performed at that event
		 * @param {boolean} bGOButtonClickFlag Flag provided for differentiating multiple table rebind calls
		 */
		handleBeforeVariantSave: function (oEvent, bGOButtonClickFlag) {
			var oCustomFilter = {
				_CUSTOM: {
					Issues: "",
					Delay: "",
					Status: ""
				}
			};
			if (this._oSmartFilter.getControlByKey("CustomIssue").getSelectedKeys()) {
				var aIssueArray = this._oSmartFilter.getControlByKey("CustomIssue").getSelectedKeys();
				oCustomFilter._CUSTOM.Issues = aIssueArray;
			}
			if (this._oSmartFilter.getControlByKey("CustomDelay").getSelectedKey()) {
				oCustomFilter._CUSTOM.Delay = this._oSmartFilter.getControlByKey("CustomDelay").getSelectedKey();
			}
			if (this._oSmartFilter.getControlByKey("CustomStatus").getSelectedKeys()) {
				var aStatusArray = this._oSmartFilter.getControlByKey("CustomStatus").getSelectedKeys();
				oCustomFilter._CUSTOM.Status = aStatusArray;
			}
			var oSmartTableInstance = this.getView().byId("idMonitorOrdersTable");

			var oFilterObject = this._oSmartFilter.getFilterData();
			oFilterObject._CUSTOM = oCustomFilter._CUSTOM;
			var bDirtyFlag = this._oVariantMgt.currentVariantGetModified();
			var vSearchFieldValue = this._oSmartFilter.getBasicSearchControl().getValue();
			this._oSmartFilter.setFilterData(oFilterObject, true);
			if (vSearchFieldValue !== "") {
				this._oSmartFilter.getBasicSearchControl().setValue(vSearchFieldValue);
			}
			if (bDirtyFlag !== this._oVariantMgt.currentVariantGetModified()) {
				this._oVariantMgt.currentVariantSetModified(bDirtyFlag);
				this._callHandleAppStateUpdate();
			}
			var aTableItems = oSmartTableInstance.getTable().getSelectedItems();
			for (var i = 0; i < aTableItems.length; i++) {
				aTableItems[i].setSelected(false);
			}
			this._oOrderReleaseButton.setEnabled(false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
			// this._oEditButton.setEnabled(false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/HoldButtonVisible", false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
			// logic to handle variant save without pressing Go button
			if (oSmartTableInstance.getTable().getShowOverlay()) {
				if (!bGOButtonClickFlag) {
					this._osmartTable.rebindTable();
				}
			}
			var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
			var aProperties = ioAppStateModel.getProperty("/appState");
			aProperties.VariantTableState = JSON.stringify(oSmartTableInstance.fetchVariant());
			ioAppStateModel.setProperty("/appState", aProperties);
			this.getOwnerComponent().updateAppStateFromAppStateModel();
		},

		/**
		 * Triggered when the save variant is pressed in the SmartFilterBar.
		 * To check if the Create tile option is selected, and updates the personalization service.
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 * @param {object} oEvent Event information after saving the variant
		 */
		handleAfterVariantSave: function (oEvent) {
			// if (this.bCreateTileSelected) {
			var sFilters = "";
			var oSmartTableInstance = this.getView().byId("idMonitorOrdersTable");
			if (oSmartTableInstance.getTable().getBindingInfo('items')) {
				sFilters = oSmartTableInstance.getTable().getBindingInfo('items').binding.sFilterParams;
			}
			// }
			TileManagement.updatePersonalizationContainer(this, this.getView().byId("idMonitorOrdersTable").getEntitySet(), sFilters);
			this.bCreateTileSelected = false;
			//update App State for the save of the variant.
			this.handleAppstateUpdate(oEvent);
			if (this._osmartTable.getTable().getShowOverlay()) {
				this._osmartTable.getTable().setShowOverlay(false);
			}
		},

		/**
		 * Manages a variant
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 * @param {object} oEvent Event information for managing the variant
		 */
		handleManageVariant: function (oEvent) {
			TileManagement.manageVariant(oEvent, this);
		},

		/**
		 * Select a variant
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 * @param {object} oEvent Event information for selecting the variant
		 */
		handleSelectVariant: function (oEvent) {
			var oSmartTableInstance = this.getView().byId("idMonitorOrdersTable");
			var ioAppStateModel = this.getOwnerComponent().getModel("AppState");
			var aProperties = ioAppStateModel.getProperty("/appState");
			jQuery.sap.delayedCall(1000, this, function () {
				aProperties.VariantTableState = JSON.stringify(oSmartTableInstance.fetchVariant());
				ioAppStateModel.setProperty("/appState", aProperties);
				this._callHandleAppStateUpdate();
			});
		},

		/** 
		 * Loads variant when the user launches tile.
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		loadInitialVariant: function () {
			var oVariantMgmt = this._oVariantMgt;
			var sVariantText = this.sSelectedVariant;
			if (oVariantMgmt && sVariantText !== "") {
				var sVariantKey;

				var aVariantItems = oVariantMgmt.getVariantItems();
				for (var iCount = 0; iCount < aVariantItems.length; iCount++) {
					if (aVariantItems[iCount].getText() === sVariantText) {
						sVariantKey = aVariantItems[iCount].getKey();
						break;
					}
				}
				if (sVariantKey) {
					oVariantMgmt.setCurrentVariantId(sVariantKey);
				}
			}
			this._oSmartFilter.determineFilterItemByName("CustomStatus").setLabelTooltip(this.getI18NText("StatusFilter"));
			this._oSmartFilter.determineFilterItemByName("CustomDelay").setLabelTooltip(this.getI18NText("DelayFilter"));
			this._oSmartFilter.determineFilterItemByName("CustomIssue").setLabelTooltip(this.getI18NText("IssueFilter"));
		},

		/** 
		 * Event handler of Icon press, which opens the IssuePopover icon.
		 * @param {object} oEvent Event info for opening the issues pop over
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleIconPress: function (oEvent) {
			// var oColor = oEvent.getSource().getColor();
			// if (oColor === "#d9d9d9") {
			// 	return "";
			// } else {
			// 	var oModel = this.getView().getModel();
			// 	var oSource = oEvent.getSource();
			// 	var oContext = oSource.getBindingContext();
			// 	var oData = {
			// 		"ManufacturingOrder": "",
			// 		"ManufacturingOrderSequence": "",
			// 		"ManufacturingOrderOperation": "",
			// 		"OperationUnit": "",
			// 		"MissingQty": "",
			// 		"ExecutionEndIsLateByM": "",
			// 		"ExecutionStIsLateByM": "",
			// 		"TotalConfirmedScrapQty": "",
			// 		"PlannedTotalQuantity": "",
			// 		"MissingComponents": "",
			// 		"ExecutionStartIsLate": "",
			// 		"ExecutionEndIsLate": "",
			// 		"YieldDeviationQty": "",
			// 		"ScrapQualityIssue": "",
			// 		"InspHasRejectedCharc": "",
			// 		"InspHasRejectedInspSubset": "",
			// 		"InspHasRejectedInspLot": ""
			// 	};
			// 	oData.ManufacturingOrder = oModel.getProperty("ManufacturingOrder", oContext);

			// 	oData.OperationUnit = oModel.getProperty("ProductionUnit", oContext);
			// 	oData.MissingQty = oModel.getProperty("OrderMissingQuantity", oContext);
			// 	oData.ExecutionEndIsLateByM = oModel.getProperty("ExecutionEndLatenessInMinutes", oContext);
			// 	oData.ExecutionStIsLateByM = oModel.getProperty("ExecutionStartLatenessInMins", oContext);
			// 	oData.TotalConfirmedScrapQty = oModel.getProperty("MfgOrderConfirmedScrapQty", oContext);
			// 	oData.PlannedTotalQuantity = oModel.getProperty("MfgOrderPlannedTotalQty", oContext);
			// 	// flags for the issues
			// 	oData.MissingComponents = oModel.getProperty("OrderHasMissingComponents", oContext);

			// 	oData.ExecutionStartIsLate = oModel.getProperty("OrderExecutionStartIsLate", oContext);
			// 	oData.ExecutionEndIsLate = oModel.getProperty("OrderExecutionEndIsLate", oContext);
			// 	oData.YieldDeviationQty = oModel.getProperty("OrderYieldDeviationQty", oContext);
			// 	oData.ScrapQualityIssue = oModel.getProperty("OrderHasQualityIssue", oContext);
			// 	oData.InspHasRejectedCharc = oModel.getProperty("InspHasRejectedCharc", oContext);
			// 	oData.InspHasRejectedInspSubset = oModel.getProperty("InspHasRejectedInspSubset", oContext);
			// 	oData.InspHasRejectedInspLot = oModel.getProperty("InspHasRejectedInspLot", oContext);

			// 	IssuePopOver.openIssuePopOver(this, oData, oEvent.getSource());
			// }

			var oModel = this.getView().getModel();

			// Worklist instance is transferred here to ManageOrderWorklistHelper 
			// because it is needed for the issue popover				
			WorklistHelper.handleIconPress(oEvent, this, oModel);
		},

		/** 
		 * Handler for material link press, opens a popover which shows the details of the material
		 * @param oEvent
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
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

			// Worklist instance is transferred here to ManageOrderWorklistHelper 
			// because it is needed for the material popover	
			WorklistHelper.handleMaterialLinkPress(oEvent, this, sMaterial, sProductionPlant);
		},

		/** 
		 * Handler for order number link press, opens a popover which shows the details of the order
		 * @param oEvent
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleOrderNumberPress: function (oEvent) {
			// var oSource = oEvent.getSource();
			// var sPath = oSource.getBindingContext().sPath;
			// var oProperty = oSource.getModel().getProperty(sPath);
			// var sManufacturingOrderId = oProperty.ManufacturingOrder || oProperty.MRPElement;
			// this.oProductionOrderPop.openProdOrdPopOver(oEvent, this, sManufacturingOrderId);

			var oSource = oEvent.getSource();
			var sPath = oSource.getBindingContext().sPath;
			var oProperty = oSource.getModel().getProperty(sPath);
			var sManufacturingOrderId = oProperty.ManufacturingOrder || oProperty.MRPElement;

			// Worklist instance is transferred here to ManageOrderWorklistHelper 
			// because it is needed for the production order popover
			WorklistHelper.handleOrderNumberPress(oEvent, this, sManufacturingOrderId);
		},

		/** 
		 * Handler for status link press, opens a popover which shows the order status information
		 * @param oEvent
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleStatusLinkPress: function (oEvent) {
			// OrderOperationStatus.openStatusPopOver(oEvent, this);

			// Worklist instance is transferred here to ManageOrderWorklistHelper 
			// because it is needed for the status popover			
			WorklistHelper.handleStatusLinkPress(oEvent, this);
		},

		/** 
		 * Handler for changing the smarttable no data text
		 * @param 
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		ChangeSTableNoDataText: function () {
			if (this.bAORDeleted) {
				this._osmartTable.setNoData(this.getI18NText("AORDeleted"));
				this._osmartTable.getTable().setNoDataText(this.getI18NText("AORDeleted"));
			} else {
				this._osmartTable.setNoData(this.getI18NText("AORSelected"));
				this._osmartTable.getTable().setNoDataText(this.getI18NText("AORSelected"));
			}
		},

		/*On click of the Go button 
		 *Loads the variants, which are changed 
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleGOBtnPress: function (oEvent) {
			this.handleBeforeVariantSave(undefined, "true");
		},

		/** 
		 * Custom Handler for creating a custom event object and calling handleAppStateUpdate method
		 * @param 
		 */
		_callHandleAppStateUpdate: function () {
			var oEvent = {
				oSourceTemp: this._oSmartFilter,
				getSource: function () {
					return this.oSourceTemp;
				}
			};
			this.handleAppstateUpdate(oEvent);
		},

		/**
		 * Unsubscribe the event bus before exiting
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		onExit: function () {
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.unsubscribe("AppState", "hanldeAppstateChanges", this.handleAppStateChanges, this);
			AORReuse.oAppSettingsButton.destroy();
			AORReuse.oAppSettingsButton = null;

			var oEventBusParams = this.getEventBusParameters();
			//Unsubscribe hold event bus
			oEventBus.unsubscribe(oEventBusParams.ApplyHoldDialog.Channel, oEventBusParams.ApplyHoldDialog.Event, oEventBusParams.ApplyHoldDialog
				.Callback, this);
			// Unsubscribe Release Order anyway event from event bus
			oEventBus.unsubscribe(oEventBusParams.ReleaseOrderAnyway.Channel, oEventBusParams.ReleaseOrderAnyway.Event,
				oEventBusParams.ReleaseOrderAnyway.Callback, this);
		},

		/**
		 * Handler for Edit order 
		 * This method will open SAP CO02 transaction in a new tab.
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 **/
		handleEditPress: function () {
			// var aItems = this._osmartTable.getTable().getSelectedItems();
			// var sPath = aItems[0].getBindingContext().sPath;
			// var sOrder = aItems[0].getBindingContext().oModel.getProperty(sPath).ManufacturingOrder;
			// //var sOrder = this.getView().getBindingContext().getObject().ManufacturingOrder;
			// ReuseUtil.editOrder(sOrder);

			var aItems = this._osmartTable.getTable().getSelectedItems();
			var sPath = aItems[0].getBindingContext().sPath;
			var sOrder = aItems[0].getBindingContext().oModel.getProperty(sPath).ManufacturingOrder;

			WorklistHelper.handleEditPress(sOrder);
		},

		handleRereadButton: function (oEvent) {
			var aTableListItems = this._osmartTable.getTable().getSelectedItems();
			//the refresh in the next line is done to get for sure new data on the 
			//production order popover for the status and the current-/ next operation after 
			//the Reread Button is triggerd otherwise there is different data on the 
			//worklist and the popover shown if the popover is already opened before  
			//the mentioned button is triggered because data is stored in memory
			this.getModel("PRODORD").refresh(false, true);
			var oLocalModel = this.getView().getModel();
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;

			WorklistHelper.handleRereadButton(aTableListItems, oLocalModel, bCompact, this.getView().getModel("ActionButtonVisiblity"));
		},

		handleBeforeExport: function (oEvent) {
			var oExportSettings = oEvent.getParameter("exportSettings");
			var aColumns = oExportSettings.workbook.columns;
			var aFixedColumns = ["OrderHasProductionHold","OrderExecutionStartIsLate","OrderExecutionEndIsLate","OrderHasMissingComponents","OrderYieldDeviationQty",
				"OrderHasQualityIssue","InspHasRejectedCharc", "InspHasRejectedInspSubset","InspHasRejectedInspLot",
				"MfgOrderScheduledStartDate", "MfgOrderScheduledStartTime", "MfgOrderActualStartDate",
				"MfgOrderActualStartTime", "MfgOrderScheduledEndDate",
				"MfgOrderScheduledEndTime", "MfgOrderConfirmedEndDate", "MfgOrderConfirmedEndTime"
			];
			var oNewColumn;
			for (var i = 0; i < aFixedColumns.length; i++) {
				var sFixedColumn = aFixedColumns[i];
				var sType;
				var sId;
				var sText;
				if (sFixedColumn.indexOf("Date") > -1) {
					sType = "date";
				} else if (sFixedColumn.indexOf("Time") > -1) {
					sType = "time";
				} else if (sFixedColumn === "OrderYieldDeviationQty"){
					sType = "number";
				} else {
					sType = "string";
				}
				for (var z = 0; z < aColumns.length; z++) {
					var oColumn = aColumns[z];
					if (sFixedColumn === "OrderHasProductionHold" &&
							oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("ProductionHold");
							break;
					} else if (sFixedColumn === "OrderExecutionStartIsLate" &&
					        oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("DelayOfStart");
							break;
					} else if (sFixedColumn  === "OrderExecutionEndIsLate" &&
					        oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("DelayOfEnd");
							break;
					} else if (sFixedColumn === "OrderHasMissingComponents" &&
					        oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("ComponentIssue");
							break;
					} else if (sFixedColumn === "OrderYieldDeviationQty" &&
					        oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("QuantityIssue");
							break;
					} else if (sFixedColumn === "OrderHasQualityIssue" &&
					        oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("QualityIssue");
							break;
					} else if (sFixedColumn === "InspHasRejectedCharc" &&
					        oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("ChargeRejected");
							break;		
					} else if (sFixedColumn === "InspHasRejectedInspSubset" &&
					        oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("SubsetRejected");
							break;
					} else if (sFixedColumn === "InspHasRejectedInspLot" &&
					        oColumn.columnId.indexOf("idColumnIssue")){
							sId = "testing" + sFixedColumn + "Field";
							sText = this.getI18NText("InspectionLotRejected");
							break;		
					} else if (sFixedColumn === oColumn.property &&
							((oColumn.columnId.indexOf("idColumnStartDateTime") === -1 && 
							oColumn.columnId.indexOf("idColumnEndDateTime") === -1 ))) {
					    	sId = "testing" + sFixedColumn.split("MfgOrder")[1] + "Field";
							sText = this.getI18NText(sFixedColumn.split("MfgOrder")[1]);
							aColumns.splice(z, 1);
							break;	
					} else if (oColumn.columnId.indexOf("idColumnIssue") > -1){
						aColumns.splice(z,1);
					}
					  else {
						sId = "testing" + sFixedColumn.split("MfgOrder")[1] + "Field";
						sText = this.getI18NText(sFixedColumn.split("MfgOrder")[1]);
					}
				}
				oNewColumn = this.getExcelWorkBookParameters(sId, sText, sFixedColumn, sType);
				oExportSettings.workbook.columns.push(oNewColumn);
			}
		},

		getExcelWorkBookParameters: function (sId, sLabel, sProperty, sType) {
			var oExcelCoumn = {
				columnId: sId,
				displayUnit: false,
				falseValue: undefined,
				inputFormat: null,
				label: sLabel,
				precision: undefined,
				property: sProperty,
				scale: undefined,
				template: null,
				textAlign: "End",
				trueValue: undefined,
				type: sType,
				unitProperty: undefined,
				width: ""
			};
			return oExcelCoumn;
		},
		/** 
		 * Handler for inspection lot link press, opens a popover which shows the order status information
		 * @param {object} oEvent Event information for pressing on inspection
		 * @memberOf i2d.mpe.orders.manages2.controller.Worklist
		 * @public
		 */
		handleInspectionPress: function (oEvent) {
			WorklistHelper.handleInspectionPress(oEvent);
		},

		onPressOrdSpcfcChange: function () {

			var that = this,
				aSelectedItems = [],
				aSelectedItemsTemp = this._osmartTable.getTable().getSelectedItems(),
				//Check if BOOVersionChangeRecordIsRqd is already available in app context. This is required to 
				//determine if Order Change can be created without a Change Record. This field can be added in requestAtLeast parameter 
				//of smart table but then it is always fetched leading to decreased performance
				sBOOVersionChangeRecordIsRqdAvailable = aSelectedItemsTemp[0].getBindingContext().getObject().hasOwnProperty(
					"BOOVersionChangeRecordIsRqd");
			var pBOOVersionChangeRecordIsRqdLoaded = new jQuery.Deferred();

			if (sBOOVersionChangeRecordIsRqdAvailable) {
				aSelectedItemsTemp.forEach(function (oSelectedItem) {
					aSelectedItems.push(oSelectedItem.getBindingContext().getObject());
				});
				pBOOVersionChangeRecordIsRqdLoaded.resolve();
			} else {
				//If routing profile customizing not availabel then get it from backend
				that.getView().getModel().read(aSelectedItemsTemp[0].getBindingContextPath(), {
					urlParameters: {
						$select: "BOOVersionChangeRecordIsRqd"
					},
					success: function (oData) {
						pBOOVersionChangeRecordIsRqdLoaded.resolve();
					},
					error: function () {
						pBOOVersionChangeRecordIsRqdLoaded.resolve();
					}
				});
			}

			//Once promise is resolved, open the popup
			pBOOVersionChangeRecordIsRqdLoaded.done(function () {
				OrdSpcfcChange.initAndOpen({
					oHoldModel: that.getView().getModel("HoldModel"),
					oCRModel: that.getView().getModel("CR"),
					oOSRModel: that.getView().getModel("OSR"),
					oSelectedOrder: that._osmartTable.getTable().getSelectedItems()[0].getBindingContext().getObject(),
					oOrderSpecificChangeDetails: that.getView().getModel("worklistView").getProperty("/oOrderSpecificChangeDetails"),
					oCallBack: that.onOrdSpcfcChangeCallBack.bind(that),
					Ischangeforwholeorder: true
				});
			});
		},

		onPressDisplayOrdScpfcChange: function () {
			NavHelper.navToShopFloorRoutingChange(this.getView().getModel("worklistView").getProperty("/oOrderSpecificChangeDetails"));
		},

		onOrdSpcfcChangeCallBack: function (oData) {
			this.getView().getModel("worklistView").setProperty("/oOrderSpecificChangeDetails", oData);
			this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
			this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", true);
		}
	});
});