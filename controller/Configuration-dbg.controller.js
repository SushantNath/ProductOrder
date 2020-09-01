/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"i2d/mpe/orders/manages2/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History"
], function (BaseController, JSONModel, History) {
	"use strict";

	return BaseController.extend("i2d.mpe.orders.manages2.controller.Configuration", {
		onInit: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("Configuration").attachPatternMatched(this.onRoutePatternMatched, this);

		},

		onRoutePatternMatched: function (oEvent) {
			
			var sOrderId = oEvent.getParameter("arguments").orderId;
			this.gsOrderId = sOrderId;
           
			var sPath = "/C_ManageProductionOrder('" + sOrderId + "')";
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var configData = oModel.getData(sPath);

			var configModel = new JSONModel();
			configModel.setData(configData);

			this.getView().setModel(configModel, "configModel");
			
			//formatting order quantity feild
			var oLocale = new sap.ui.core.Locale("en-US");
			var oFormatOptions = {
				minIntegerDigits: 2,
				minFractionDigits: 3
			};
			var oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions, oLocale);
			var oMfgOrderPlannedTotalQty = oFloatFormat.format(configData.MfgOrderPlannedTotalQty) + " " + configData.ProductionUnit;

			var oComp1 = sap.ui.getCore().createComponent({
				name: "sap.i2d.lo.lib.vchclf.components.configuration",
				id: "Comp1",
				settings: {
					semanticObject: "ProductionOrder",
					objectKey: "{parts: ['configModel>/ManufacturingOrder', 'configModel>/Customer'], formatter: 'sap.i2d.lo.lib.vchclf.components.configuration.formatter.HeaderFieldFormatter.getConcatenatedObjectKey'}",
					draftKey: "{ParentDraftUUID}",
					draftKeyIsString: true,
					uiMode: "Display",
					headerConfiguration: {
						title: "{configModel>/Material}",
						headerFields: [{
							description: "{i18n>productionDocument}",
							properties: {
								text: "{parts: ['configModel>/ManufacturingOrder', 'configModel>/ManufacturingOrder', 'i18n>HEADER_DOC_ITEM'], formatter: 'sap.i2d.lo.lib.vchclf.components.configuration.formatter.HeaderFieldFormatter.getText'}"
							},
							controlType: "Text"
						}, {
							description: "{i18n>orderQuantity}",
							properties: {
								text: oMfgOrderPlannedTotalQty
							},
							controlType: "Text"
						}, {
							description: "{i18n>orderType}",
							properties: {
								text: "{parts: ['configModel>/ManufacturingOrderTypeName', 'configModel>/ManufacturingOrderType', 'i18n>HEADER_FIELD_VALUE'], formatter: 'sap.i2d.lo.lib.vchclf.components.configuration.formatter.HeaderFieldFormatter.getText'}"
							},
							controlType: "Text"
						}, 
						{
							description: "{i18n>productionPlant}",
							properties: {
								text: "{parts: ['configModel>/MRPAreaText', 'configModel>/MRPPlant', 'i18n>HEADER_FIELD_VALUE'], formatter: 'sap.i2d.lo.lib.vchclf.components.configuration.formatter.HeaderFieldFormatter.getText'}"
							},
							controlType: "Text"
						},{
							properties: {
								id: "headerFieldPrice",
								visible: false
							}
						}]
					}

				}

			});

			this.getView()
				.byId("configurationComponentContainer")
				.setComponent(oComp1);

		},

		onNavBack: function () {

			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("Object", true);
			}

		}

	});
});