/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"i2d/mpe/orders/manages2/model/models",
	"sap/ui/core/routing/History",
	"i2d/mpe/orders/manages2/controller/ErrorHandler",
	"sap/ui/core/routing/HashChanger"
], function(UIComponent, Device, models, History, ErrorHandler, HashChanger) {
	"use strict";

	return UIComponent.extend("i2d.mpe.orders.manages2.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this function, the FLP and device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			// set the FLP model
			this.setModel(models.createFLPModel(), "FLP");
			// Initialize the app state handling for the application
			this.intializeAppState();
			// Initial Refresh Load flag for loading previous appstate data
			this.bInitialRefreshLoadAppstate = true;
			//this.addAppStateKey();
			this.setOrderDetailModel();
            var oComponentData = this.getComponentData();
            this.oHashChanger = HashChanger.getInstance();
			var sPatternParam = this.oHashChanger.getHash();
			this._oRouter = this.getRouter();
			if (oComponentData && oComponentData.startupParameters && ( oComponentData.startupParameters.OrderId || oComponentData.startupParameters.ProductionOrder) && ( oComponentData.startupParameters
				.IsEdit || oComponentData.startupParameters.IsEditable)) {
				var oOrderDetailModel = this.getModel("DetailModel");
				var oOrderDetailData = oOrderDetailModel.getData();
				oOrderDetailData.orderId = (oComponentData.startupParameters.OrderId === undefined ? oComponentData.startupParameters.ProductionOrder[0] : oComponentData.startupParameters.OrderId[0]);
				oOrderDetailData.IsEdit = (oComponentData.startupParameters.IsEdit === undefined ? oComponentData.startupParameters.IsEditable[0] : oComponentData.startupParameters.IsEdit[0]);
				oOrderDetailData.bEnableAutoBinding = false;
				oOrderDetailModel.setData(oOrderDetailData);
				this._crossAppNavToDetail(this.getRouter(), oComponentData, this.oHashChanger);
				// create the views based on the url/hash
				this._oRouter.initialize();
			} else {
				if (sPatternParam) {
					if(sPatternParam.indexOf("sap-iapp-state") > -1){
						this.sOldAppStateKey = sPatternParam.split("sap-iapp-state=")[1];
						this._extractInnerAppStateFromKey(this.sOldAppStateKey);
					} else {
						this.sOldAppStateKey = this.getInnerAppStateKey();
						this.bInitialRefreshLoadAppstate = false;
					}
					if (sPatternParam.indexOf("C_ManageProductionOrder") > -1 && sPatternParam.indexOf("sap-iapp-state") > -1) {
						this._oRouter.initialize(true);
						this.addAppStateKey("object", sPatternParam.split("/")[1]);
					} else if(sPatternParam.indexOf("C_ManageProductionOrder") === -1 && sPatternParam.indexOf("sap-iapp-state") > -1){
						this._oRouter.initialize(true);
						this.addAppStateKey("worklist");
					} else {
						this._oRouter.initialize();
					}
				} else {
					// for retrieveing previous app state data.
					this.sOldAppStateKey = this.getInnerAppStateKey();
					this.bInitialRefreshLoadAppstate = false;
					// create the views based on the url/hash
					this._oRouter.initialize(true);
					this.addAppStateKey("worklist");
				}
			}
		},
		
		_crossAppNavToDetail: function(oRouter, oComponentData, oHashChanger) {
			// handle the case that App was reached via Cross App navigation
			if (oComponentData && oComponentData.startupParameters && (jQuery.isArray(oComponentData.startupParameters.OrderId) || jQuery.isArray(oComponentData.startupParameters.ProductionOrder)) &&
				(jQuery.isArray(oComponentData.startupParameters.IsEdit) || jQuery.isArray(oComponentData.startupParameters.IsEditable))) {
					var sOrder = (oComponentData.startupParameters.OrderId === undefined ? oComponentData.startupParameters.ProductionOrder[0] : oComponentData.startupParameters.OrderId[0]);
				var sUrl = oRouter.getURL("object", {
					orderId: "C_ManageProductionOrder('" + sOrder + "')",
					// isEdit: oComponentData.startupParameters.IsEdit[0],
					iAppState: this.getInnerAppStateKey()
				});
				if (sUrl) {
					oHashChanger.replaceHash(sUrl);
				}
			}
		},
		
		_crossAppNavInApp: function(sView, oRouter, sOrderId, oHashChanger) {
			// handle the case that App was reached via Cross App navigation
			var sUrl;
			if(sView === "worklist"){
				sUrl = oRouter.getURL(sView, {
					iAppState: this.getInnerAppStateKey()
				});
			} else {
				sUrl = oRouter.getURL(sView, {
					orderId: sOrderId,
					// isEdit: oComponentData.startupParameters.IsEdit[0],
					iAppState: this.getInnerAppStateKey()
				});
			}
			if (sUrl) {
				oHashChanger.replaceHash(sUrl);
			}
		},

		/** 
		 * Set named model, whose data can be used later in the blocks to apply the filters
		 * and render the data of the selected operation in Object page.
		 */
		setOrderDetailModel: function() {
			var oOrderDetailModel = new sap.ui.model.json.JSONModel({});
			var oOrderDetailData = oOrderDetailModel.getData();
			oOrderDetailData.bEnableAutoBinding = true;
			oOrderDetailModel.setData(oOrderDetailData);
			this.setModel(oOrderDetailModel, "DetailModel");
		},
		/**
		 * Initiated from the Init of the application
		 * In this function , the appstate Life Cycle is initiated
		 * @public
		 */

		intializeAppState: function() {
			var oComponentInstance = this,
				oCrossApplicationNavigationService = sap.ushell.Container.getService("CrossApplicationNavigation");

			this.oCrossAppStatePromise = new jQuery.Deferred(); // Done when startup CrossAppState has been transferred into the model
			this.oInnerAppStatePromise = new jQuery.Deferred(); // Done when above and startup InnerAppState transferred into the model

			// Model creation
			// we create and register models prior to the createContent method invocation
			this.oAppStateModel = new sap.ui.model.json.JSONModel({
				appState: {
					filter: "Filters",
					CollectionName: "Data"
				}
			});
			this.setModel(this.oAppStateModel, "AppState");

			// create a model containing the generated links for cross application navigation in our model
			// we use the Application state key to pass information to the called applications
			// the actual links of the model are filled below, using the application state key
			this.oNavTargetsModel = new sap.ui.model.json.JSONModel({
				toOurAppWithState: "",
				toOurAppNoState: ""
			});
			this.setModel(this.oNavTargetsModel, "navTargets");

			// create a new Application state (this.oAppState) for this Application instance
			this.oAppState = oCrossApplicationNavigationService.createEmptyAppState(this);

			// now that we know the key, we can calculate the CrossApplication links
			this.calculateCrossAppLinks(); //because we have the same key for the whole session we need to initialize it only once

			oCrossApplicationNavigationService.getStartupAppState(this).done(function(oStartupCrossAppState) {
				// oComponentInstance.updateModelFromAppstate(oComponentInstance.oAppStateModel, oStartupCrossAppState, "Set Model from StartupAppState");
				oComponentInstance.updateModelFromAppstate(oComponentInstance.oAppStateModel, oStartupCrossAppState);
				oComponentInstance.oCrossAppStatePromise.resolve();
			});

			// register a handler to set the current InnerAppStateKey into the inner-app-hash
			// (via a navigation to the "same/inital" route but with a different inner-app-state)
			// This must be done *after* we have processed a potential inner app state from initial invocation (thus the promise)
			this.oInnerAppStatePromise.done(function() {
				//saving data on the current application state after it has been initialized by the "passed" application state
				//to assure that even in case user has not changed anything newly created application state is saved in the backend
				oComponentInstance.updateAppStateFromAppStateModel();
			});
		},

		/**
		 * Extract an inner AppState key from a present route
		 *
		 * @param {string} sInnerAppStateKey
		 *   The InnerAppStateKey of Application
		 * @param {string} sCurrentRouteName
		 *   The currently route name e.g. "toCatIcons"
		 *
		 * @private
		 */
		extractInnerAppStateFromURL: function(sInnerAppStateKey, sCurrentRouteName, sParameters) {
			var that = this;
			var sLocalOldAppStateKey = sInnerAppStateKey;
			if(this.bInitialRefreshLoadAppstate){
				sLocalOldAppStateKey = this.sOldAppStateKey;
				this.bInitialRefreshLoadAppstate = false;
			}
			// if the key is distinct from our (new instantiation key), it must be an old
			// "old" (= initial) key passed to us
			if (sLocalOldAppStateKey === this.getInnerAppStateKey()) {
				this.oInnerAppStatePromise.resolve(); //sCurrentRouteName should be passed.
				return;
			}
			// var sLocalOldAppStateKey = this.sOldAppStateKey;
			// this.sOldAppStateKey = this.getInnerAppStateKey();
			// we have a distinct appstate key -> generate a new model
			that.createANewAppStateModel();
			// we must apply the inner App State *after* treating CrossAppState (x-app-state)
			this.oCrossAppStatePromise.done(function() {
				sap.ushell.Container.getService("CrossApplicationNavigation").getAppState(that, sLocalOldAppStateKey).done(function(
					oStartupInnerAppState) {
					that.updateModelFromAppstate(that.oAppStateModel, oStartupInnerAppState);
					that.oInnerAppStatePromise.resolve(); //sCurrentRouteName should be passed.
				});
			});
			// return;
			that.oInnerAppStatePromise.done(function() {
				setTimeout(function() {
				that.addAppStateKey(sCurrentRouteName, sParameters); //sCurrentRouteName should be passed.
				}, 0); //400
			});
		},
		
		
		/**
		 * Extract an inner AppState data from AppState Key
		 *
		 * @param {string} sInnerAppStateKey
		 *   The InnerAppStateKey of Application
		 * 
		 * @private
		 */
		_extractInnerAppStateFromKey: function(sInnerAppStateKey) {
			var that = this;
			sap.ushell.Container.getService("CrossApplicationNavigation").getAppState(that, sInnerAppStateKey).done(function(
				oStartupInnerAppState) {
				var oDetailModel = that.getModel("DetailModel");
				if(oStartupInnerAppState.getData()){
					oDetailModel.setData(oStartupInnerAppState.getData());
				}
			});
		},

		/**
		 * Creates a new AppState and calculate links for the bottom section of List.controller.js
		 *
		 * @private
		 */
		createANewAppStateModel: function() {
			// create a new Application state (this.oAppState) for this Application instance
			this.oAppState = sap.ushell.Container.getService("CrossApplicationNavigation").createEmptyAppState(this);
			// now that we know the key, we can calculate the CrossApplication links
			this.calculateCrossAppLinks(); //we recalculate the model as the links are updated
		},

		getInnerAppStateKey: function() {
			return (this.oAppState && this.oAppState.getKey()) || " key not set yet ";
		},
		/**
		 * Move application state data into the model.
		 * This is called on startup of the application
		 * for sap-xapp-state passed data and sap-iapp-state passed data.
		 *
		 * @param {object} oModel
		 *   Model which should be used to allocate the data from oAppState
		 * @param {object} oAppState
		 *   AppState including the data
		 * @param {string} sComment
		 *   Comment for logging purposes
		 * @returns {boolean}
		 *   Returns true if data of the AppState has been set to the model
		 *
		 * @private
		 *  */
		updateModelFromAppstate: function(oModel, oAppState) {
			var oAppStateData = oAppState.getData();
			if (oAppStateData) {	
				var sPattern = this.getRouter().oHashChanger.getHash();
				if (sPattern.indexOf("C_ManageProductionOrder") > -1) {
					sap.ui.getCore().getEventBus().publish("AppState", "hanldeAppstateDetailChanges", oAppStateData.detailPage);
				} else {
					sap.ui.getCore().getEventBus().publish("AppState", "hanldeAppstateChanges", oAppStateData);
				}
				return true;
			}
			return false;
		},

		/**
		 * Update the application state with the current application data that is called on any model change
		 *
		 * @private
		 */
		updateAppStateFromAppStateModel: function() {
			var oData;
			oData = this.oAppStateModel.getProperty("/appState");
			this.oAppState.setData(oData);
			this.oAppState.save();
		},

		/**
		 *  calculate links for cross application navigation targets
		 *
		 * @private
		 */
		calculateCrossAppLinks: function() {
			var sHref,
				oCrossApplicationNavigationService = sap.ushell.Container.getService("CrossApplicationNavigation");

			sHref = oCrossApplicationNavigationService.hrefForExternal({
				target: {
					semanticObject: "ManufacturingOrderItem",
					action: "manage"
				},
				params: {
					"VariantName": "One"
				}, // assures distinct, not relevant for functionality!
				appStateKey: this.oAppState.getKey()
			}, this) || "";
			this.oNavTargetsModel.setProperty("/toOurAppWithState", sHref);
			// 2nd link, no app state transferred
			sHref = oCrossApplicationNavigationService.hrefForExternal({
				target: {
					semanticObject: "ManufacturingOrderItem",
					action: "manage"
				},
				params: {
					"VarianName": "two"
				} // assures distinct, not relevant for functionality!
			}) || "";
			this.oNavTargetsModel.setProperty("/toOurAppNoState", sHref);

		},

		/**
		 *   central navTo route takes care of setting the current inner app state key correctly
		 *
		 * @private
		 */
		addAppStateKey: function(sCurrentRouteName, sParameters) {
			if (this._oRouter) {
				if (sCurrentRouteName === "worklist") {
					this._oRouter.navTo(sCurrentRouteName, {
						iAppState: this.getInnerAppStateKey()
					}, true);
				} else {
					this._oRouter.navTo(sCurrentRouteName, {
						orderId: sParameters,
						iAppState: this.getInnerAppStateKey()
					}, true);
				}
			}
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy: function() {
			this._oErrorHandler.destroy();
			// cleaning up routers
			// this.getRouter().stop();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}
	});

});