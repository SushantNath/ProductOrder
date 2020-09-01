/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/Device", "i2d/mpe/orders/manages2/model/models", "sap/ui/core/routing/History",
	"i2d/mpe/orders/manages2/controller/ErrorHandler", "sap/ui/core/routing/HashChanger"
], function (U, D, m, H, E, a) {
	"use strict";
	return U.extend("i2d.mpe.orders.manages2.Component", {
		metadata: {
			manifest: "json"
		},
		init: function () {
			U.prototype.init.apply(this, arguments);
			this._oErrorHandler = new E(this);
			this.setModel(m.createDeviceModel(), "device");
			this.setModel(m.createFLPModel(), "FLP");
			this.intializeAppState();
			this.bInitialRefreshLoadAppstate = true;
			this.setOrderDetailModel();
			var c = this.getComponentData();
			this.oHashChanger = a.getInstance();
			var p = this.oHashChanger.getHash();
			this._oRouter = this.getRouter();
			if (c && c.startupParameters && (c.startupParameters.OrderId || c.startupParameters.ProductionOrder) && (c.startupParameters.IsEdit ||
					c.startupParameters.IsEditable)) {
				var o = this.getModel("DetailModel");
				var O = o.getData();
				O.orderId = (c.startupParameters.OrderId === undefined ? c.startupParameters.ProductionOrder[0] : c.startupParameters.OrderId[0]);
				O.IsEdit = (c.startupParameters.IsEdit === undefined ? c.startupParameters.IsEditable[0] : c.startupParameters.IsEdit[0]);
				O.bEnableAutoBinding = false;
				o.setData(O);
				this._crossAppNavToDetail(this.getRouter(), c, this.oHashChanger);
				this._oRouter.initialize();
			} else {
				if (p) {
					if (p.indexOf("sap-iapp-state") > -1) {
						this.sOldAppStateKey = p.split("sap-iapp-state=")[1];
						this._extractInnerAppStateFromKey(this.sOldAppStateKey);
					} else {
						this.sOldAppStateKey = this.getInnerAppStateKey();
						this.bInitialRefreshLoadAppstate = false;
					}
					if (p.indexOf("C_ManageProductionOrder") > -1 && p.indexOf("sap-iapp-state") > -1) {
						this._oRouter.initialize(true);
						this.addAppStateKey("object", p.split("/")[1]);
					} else if (p.indexOf("C_ManageProductionOrder") === -1 && p.indexOf("sap-iapp-state") > -1) {
						this._oRouter.initialize(true);
						this.addAppStateKey("worklist");
					} else {
						this._oRouter.initialize();
					}
				} else {
					this.sOldAppStateKey = this.getInnerAppStateKey();
					this.bInitialRefreshLoadAppstate = false;
					this._oRouter.initialize(true);
					this.addAppStateKey("worklist");
				}
			}
		},
		_crossAppNavToDetail: function (r, c, h) {
			if (c && c.startupParameters && (jQuery.isArray(c.startupParameters.OrderId) || jQuery.isArray(c.startupParameters.ProductionOrder)) &&
				(jQuery.isArray(c.startupParameters.IsEdit) || jQuery.isArray(c.startupParameters.IsEditable))) {
				var o = (c.startupParameters.OrderId === undefined ? c.startupParameters.ProductionOrder[0] : c.startupParameters.OrderId[0]);
				var u = r.getURL("object", {
					orderId: "C_ManageProductionOrder('" + o + "')",
					iAppState: this.getInnerAppStateKey()
				});
				if (u) {
					h.replaceHash(u);
				}
			}
		},
		_crossAppNavInApp: function (v, r, o, h) {
			var u;
			if (v === "worklist") {
				u = r.getURL(v, {
					iAppState: this.getInnerAppStateKey()
				});
			} else {
				u = r.getURL(v, {
					orderId: o,
					iAppState: this.getInnerAppStateKey()
				});
			}
			if (u) {
				h.replaceHash(u);
			}
		},
		setOrderDetailModel: function () {
			var o = new sap.ui.model.json.JSONModel({});
			var O = o.getData();
			O.bEnableAutoBinding = true;
			o.setData(O);
			this.setModel(o, "DetailModel");
		},
		intializeAppState: function () {
			var c = this,
				C = sap.ushell.Container.getService("CrossApplicationNavigation");
			this.oCrossAppStatePromise = new jQuery.Deferred();
			this.oInnerAppStatePromise = new jQuery.Deferred();
			this.oAppStateModel = new sap.ui.model.json.JSONModel({
				appState: {
					filter: "Filters",
					CollectionName: "Data"
				}
			});
			this.setModel(this.oAppStateModel, "AppState");
			this.oNavTargetsModel = new sap.ui.model.json.JSONModel({
				toOurAppWithState: "",
				toOurAppNoState: ""
			});
			this.setModel(this.oNavTargetsModel, "navTargets");
			this.oAppState = C.createEmptyAppState(this);
			this.calculateCrossAppLinks();
			C.getStartupAppState(this).done(function (s) {
				c.updateModelFromAppstate(c.oAppStateModel, s);
				c.oCrossAppStatePromise.resolve();
			});
			this.oInnerAppStatePromise.done(function () {
				c.updateAppStateFromAppStateModel();
			});
		},
		extractInnerAppStateFromURL: function (i, c, p) {
			var t = this;
			var l = i;
			if (this.bInitialRefreshLoadAppstate) {
				l = this.sOldAppStateKey;
				this.bInitialRefreshLoadAppstate = false;
			}
			if (l === this.getInnerAppStateKey()) {
				this.oInnerAppStatePromise.resolve();
				return;
			}
			t.createANewAppStateModel();
			this.oCrossAppStatePromise.done(function () {
				sap.ushell.Container.getService("CrossApplicationNavigation").getAppState(t, l).done(function (s) {
					t.updateModelFromAppstate(t.oAppStateModel, s);
					t.oInnerAppStatePromise.resolve();
				});
			});
			t.oInnerAppStatePromise.done(function () {
				setTimeout(function () {
					t.addAppStateKey(c, p);
				}, 0);
			});
		},
		_extractInnerAppStateFromKey: function (i) {
			var t = this;
			sap.ushell.Container.getService("CrossApplicationNavigation").getAppState(t, i).done(function (s) {
				var d = t.getModel("DetailModel");
				if (s.getData()) {
					d.setData(s.getData());
				}
			});
		},
		createANewAppStateModel: function () {
			this.oAppState = sap.ushell.Container.getService("CrossApplicationNavigation").createEmptyAppState(this);
			this.calculateCrossAppLinks();
		},
		getInnerAppStateKey: function () {
			return (this.oAppState && this.oAppState.getKey()) || " key not set yet ";
		},
		updateModelFromAppstate: function (M, A) {
			var o = A.getData();
			if (o) {
				var p = this.getRouter().oHashChanger.getHash();
				if (p.indexOf("C_ManageProductionOrder") > -1) {
					sap.ui.getCore().getEventBus().publish("AppState", "hanldeAppstateDetailChanges", o.detailPage);
				} else {
					sap.ui.getCore().getEventBus().publish("AppState", "hanldeAppstateChanges", o);
				}
				return true;
			}
			return false;
		},
		updateAppStateFromAppStateModel: function () {
			var d;
			d = this.oAppStateModel.getProperty("/appState");
			this.oAppState.setData(d);
			this.oAppState.save();
		},
		calculateCrossAppLinks: function () {
			var h, c = sap.ushell.Container.getService("CrossApplicationNavigation");
			h = c.hrefForExternal({
				target: {
					semanticObject: "ManufacturingOrderItem",
					action: "manage"
				},
				params: {
					"VariantName": "One"
				},
				appStateKey: this.oAppState.getKey()
			}, this) || "";
			this.oNavTargetsModel.setProperty("/toOurAppWithState", h);
			h = c.hrefForExternal({
				target: {
					semanticObject: "ManufacturingOrderItem",
					action: "manage"
				},
				params: {
					"VarianName": "two"
				}
			}) || "";
			this.oNavTargetsModel.setProperty("/toOurAppNoState", h);
		},
		addAppStateKey: function (c, p) {
			if (this._oRouter) {
				if (c === "worklist") {
					this._oRouter.navTo(c, {
						iAppState: this.getInnerAppStateKey()
					}, true);
				} else {
					this._oRouter.navTo(c, {
						orderId: p,
						iAppState: this.getInnerAppStateKey()
					}, true);
				}
			}
		},
		destroy: function () {
			this._oErrorHandler.destroy();
			U.prototype.destroy.apply(this, arguments);
		},
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!D.support.touch) {
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}
	});
});