/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["i2d/mpe/orders/manages2/controller/BaseController", "sap/i2d/mpe/lib/commons1/fragments/ManageOrderWorklistHelper",
	"sap/ui/model/resource/ResourceModel", "sap/ui/model/json/JSONModel", "i2d/mpe/orders/manages2/model/formatter",
	"sap/i2d/mpe/lib/commons1/utils/formatter", "sap/ui/model/Filter", "sap/ui/model/FilterOperator",
	"sap/i2d/mpe/lib/aors1/AOR/AORFragmentHandler", "sap/i2d/mpe/lib/popovers1/fragments/IssuePopOverController",
	"sap/i2d/mpe/lib/popovers1/fragments/MaterialController", "sap/i2d/mpe/lib/popovers1/fragments/ProductionOrderController",
	"sap/i2d/mpe/lib/commons1/utils/saveAsTile", "sap/i2d/mpe/lib/commons1/fragments/OrderOperationStatus",
	"sap/i2d/mpe/lib/commons1/utils/util", "sap/m/MessageToast", "sap/m/MessageBox",
	"sap/i2d/mpe/lib/commons1/fragments/EditQtyAndDateDialog", "sap/i2d/mpe/lib/commons1/fragments/ApplyHoldDialog",
	"sap/i2d/mpe/lib/commons1/utils/constants", "sap/i2d/mpe/lib/commons1/fragments/OrdSpcfcChange",
	"sap/i2d/mpe/lib/commons1/utils/NavHelper"
], function (B, W, R, J, f, c, F, a, A, I, M, P, T, O, b, d, e, E, g, h, j, N) {
	"use strict";
	return B.extend("i2d.mpe.orders.manages2.controller.Worklist", {
		formatter: f,
		commonFormatter: c,
		onInit: function () {
			var t = this;
			this.bAORFilterFlag = false;
			this.bAORDeleted = false;
			this.bAssignDefaultStatusFilter = true;
			this._oSmartFilter = this.getView().byId("idSmartFilterBar");
			this._oVariantMgt = this.getView().byId("idSmartVManagement");
			this._osmartTable = this.getView().byId("idMonitorOrdersTable");
			this._oErrorMessageToggleButton = this.getView().byId("idErrorMessageCountToggleButton");
			this._bInitialLoadFilterAppStateCheck = true;
			sap.ushell.Container.getService("Personalization").getContainer("i2d.mpe.Supervisor").done(function (n) {
				if (n.getItemValue("AssignedSupervisors")) {
					t.AssignedSupervisor = n.getItemValue("AssignedSupervisors");
				}
				if (n.getItemValue("AssignedWorkcenters")) {
					t.AssignedWorkcenter = n.getItemValue("AssignedWorkcenters");
				}
				t.loadAORData();
			});
			var o = sap.ui.getCore().getEventBus();
			var i = this.getEventBusParameters();
			o.subscribe(i.EditQtyAndDateDialog.Channel, i.EditQtyAndDateDialog.Event, i.EditQtyAndDateDialog.Callback, this);
			o.subscribe(i.ApplyHoldDialog.Channel, i.ApplyHoldDialog.Event, i.ApplyHoldDialog.Callback, this);
			o.subscribe(i.ReleaseOrderAnyway.Channel, i.ReleaseOrderAnyway.Event, i.ReleaseOrderAnyway.Callback, this);
			this.sSelectedVariant = "";
			var C = sap.ui.core.Component.getOwnerIdFor(this.getView());
			var k = sap.ui.component(C);
			if (k && k.getComponentData() && k.getComponentData().startupParameters && k.getComponentData().startupParameters.VariantID) {
				this.sSelectedVariant = k.getComponentData().startupParameters.VariantID[0];
				this.bAssignDefaultStatusFilter = false;
			}
			this._osmartTable.setIgnoreFromPersonalisation(
				"ManufacturingOrder,Material,MfgOrderScheduledStartDate,MfgOrderScheduledStartTime,MfgOrderScheduledEndDate,MfgOrderScheduledEndTime,MfgOrderActualStartDate,MfgOrderActualEndDate, MfgOrderActualStartTime, MfgOrderPlannedStartDate, MfgOrderPlannedEndDate,  MfgOrderConfirmedEndDate, MfgOrderTotalCommitmentDate, MfgOrderCreationDate, LastChangeDate, MfgOrderScheduledReleaseDate, MfgOrderActualReleaseDate, MfgOrderPlannedReleaseDate, MfgOrderConfirmedEndDate,MfgOrderConfirmedEndTime,InspHasRejectedCharc,InspHasRejectedInspLot,InspHasRejectedInspSubset"
			);
			this.getRouter().getRoute("worklist").attachPatternMatched(this.handleRouteMatched, this);
			o.subscribe("AppState", "hanldeAppstateChanges", this.handleAppStateChanges, this);
			b.setWorklistCtrlReference(this);
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
			this.setModel(new J({
				"oOrderSpecificChangeDetails": {}
			}), "worklistView");
			var r = true;
			var s = true;
			var l = true;
			var H = true;
			var m = true;
			if (sap.ushell && sap.ushell.Container) {
				var S = [];
				S.push("#ProductionOrder-change");
				sap.ushell.Container.getService("CrossApplicationNavigation").isIntentSupported(S).done(function (n) {
					if (n) {
						s = n["#ProductionOrder-change"].supported;
						W.onInit(r, s, H, m, this.getView(), l);
					}
				}.bind(this)).fail(function () {
					jQuery.sap.log.error("Reading intent data failed.");
					s = false;
					W.onInit(r, s, H, m, this.getView(), l);
				}.bind(this));
			} else {
				W.onInit(r, s, H, m, this.getView(), l);
			}
		},
		onDataReceived: function (o) {
			if (o.getParameters().getParameters().data && o.getParameters().getParameters().data.results && o.getParameters().getParameters().data
				.results[0]) {
				var i = {};
				i.issues = [{
					id: "All",
					name: this.getI18NText("AllIssues")
				}, {
					id: "Delay",
					name: this.getI18NText("Delay")
				}, {
					id: "ComponentIssue",
					name: this.getI18NText("ComponentIssue")
				}, {
					id: "QuantityIssue",
					name: this.getI18NText("QuantityIssue")
				}, {
					id: "QualityIssue",
					name: this.getI18NText("QualityIssue")
				}];
				var C = o.getParameters().getParameters().data.results;
				var H = C[0].MfgFeatureIsActiveInAnyPlant;
				if (H === "X" || H === true) {
					i.issues.push({
						id: "ProductionHold",
						name: this.getI18NText("ProductionHold")
					});
				}
				var k = new J(i);
				if (!this.getModel("customHoldFiltersModel")) {
					this.getView().setModel(k, "customHoldFiltersModel");
				}
			}
		},
		onHandleMessagesButtonPress: function (o) {
			var m = o.getSource();
			if (!this._messagePopover) {
				this._messagePopover = sap.ui.xmlfragment("i2d.mpe.orders.manages2.fragments.MessagePopover", this);
				m.addDependent(this._messagePopover);
			}
			this._messagePopover.toggle(m);
		},
		getWorklistI18nModel: function () {
			var i = jQuery.sap.getModulePath("sap.i2d.mpe.lib.commons1") + "/" + "i18n/i18n.properties";
			var o = new R({
				bundleUrl: i
			});
			return o;
		},
		onAfterRendering: function () {
			if (!this.getModel("customFiltersModel")) {
				this.setCustomFiltersData();
			}
			var p = this.getView().getId();
			var s = p.split("-");
			this.oSemanticObj = "#" + s[1] + "-" + s[2];
		},
		ApplyFilterOnAOR: function (s, S) {
			this.AssignedSupervisor = s;
			this.AssignedWorkcenter = S;
			if ((this.AssignedSupervisor && this.AssignedSupervisor !== null && this.AssignedSupervisor.length > 0) || (this.AssignedWorkcenter &&
					this.AssignedWorkcenter !== null && this.AssignedWorkcenter.length > 0)) {
				this.bAORDeleted = false;
			} else {
				this.bAORDeleted = true;
			}
			this.bAORFilterFlag = true;
			this._osmartTable.rebindTable();
			T.updateTileCountURL(this);
		},
		loadAORData: function () {
			if ((this.AssignedWorkcenter && this.AssignedWorkcenter !== null && this.AssignedWorkcenter.length > 0) || (this.AssignedSupervisor &&
					this.AssignedSupervisor !== null && this.AssignedSupervisor.length > 0)) {
				A.loadSFCSettingsMenuOption(this, "i2d.mpe.Supervisor", true);
				this.bAORDeleted = false;
				this.bAORFilterFlag = true;
			} else {
				this.bAORDeleted = true;
				this.bAORFilterFlag = false;
				A.loadSFCSettingsMenuOption(this, "i2d.mpe.Supervisor", false);
			}
		},
		onCategorySelectionFinish: function (o) {
			var C = this.getView().byId("idSmartFilterBar");
			C.fireFilterChange(o);
		},
		handleRouteMatched: function (o) {
			this.sAppState = o.getParameter("arguments").iAppState;
			var C = o.getParameter("config").name;
			this.getOwnerComponent().extractInnerAppStateFromURL(this.sAppState, C);
			var i = this.getOwnerComponent().getModel("AppState");
			var p = i.getProperty("/appState");
			p.selectedOrderData = undefined;
			i.setProperty("/appState", p);
			this.getOwnerComponent().updateAppStateFromAppStateModel();
			var k = this.getView().getModel("DetailModel");
			var l = k.getData();
			l.selectedOrderData = undefined;
			k.setData(l);
			this.getModel().setUseBatch(true);
			if (this._oErrorMessageToggleButton && this._oErrorMessageToggleButton.setVisible) {
				this._oErrorMessageToggleButton.setVisible(true);
			}
			var D = function (m, n, q) {
				n.setData(q);
				m._osmartTable.rebindTable();
			};
			if (l.bReleasedSuccess) {
				l.bReleasedSuccess = false;
				D(this, k, l);
			} else if (l.bHoldSuccess) {
				l.bHoldSuccess = false;
				D(this, k, l);
			}
		},
		handleAppStateChanges: function (o, i, D) {
			this._bInitialLoadFilterAppStateCheck = true;
			var s = this.getView().byId("idSmartFilterBar");
			if (D.bDirtyFlag) {
				this._oVariantMgt.currentVariantSetModified(true);
			}
			if (D.VariantState && D.VariantState !== "") {
				s.setCurrentVariantId(D.variantId);
				s.applyVariant(D.VariantState);
			}
			var k = this.getOwnerComponent().getModel("AppState");
			if (D.issuesFilter) {
				s.getControlByKey("CustomIssue").setSelectedKeys(D.issuesFilter);
				k.getProperty("/appState").issuesFilter = D.issuesFilter;
			}
			if (D.delayFilter || D.delayFilter === "") {
				s.getControlByKey("CustomDelay").setSelectedKey(D.delayFilter);
				k.getProperty("/appState").delayFilter = D.delayFilter;
			}
			if (D.statusFilter) {
				s.getControlByKey("CustomStatus").setSelectedKeys(D.statusFilter);
				k.getProperty("/appState").statusFilter = D.statusFilter;
			}
			var S = JSON.parse(D.VariantTableState);
			k.getProperty("/appState").VariantTableState = D.VariantTableState;
			if (this._osmartTable.getTable() && this._osmartTable.getTable().getShowOverlay()) {
				if (S && S.columns && (D.variantId === "" || D.bDirtyFlag)) {
					this._osmartTable.applyVariant(S);
				} else {
					this._osmartTable.rebindTable();
				}
			} else {
				if (S && S.columns && (D.variantId === "" || D.bDirtyFlag)) {
					this._osmartTable.applyVariant(S);
				}
			}
			this.getOwnerComponent().updateAppStateFromAppStateModel();
		},
		handleAppstateUpdate: function (o) {
			var i = this.getOwnerComponent().getModel("AppState");
			var p = i.getProperty("/appState");
			p.variantId = o.getSource().getCurrentVariantId();
			p.VariantState = o.getSource().fetchVariant();
			p.bDirtyFlag = this._oVariantMgt.currentVariantGetModified();
			i.setProperty("/appState", p);
			this.getOwnerComponent().updateAppStateFromAppStateModel();
		},
		handleOrderSelection: function (o) {
			var s = o.getParameter("listItem").getBindingContextPath();
			var i = s.substr(1);
			this.updateOrderDetailModel(i);
			var k = this.getOwnerComponent().getModel("AppState");
			var p = k.getProperty("/appState");
			p.selectedOrderData = this.getView().getModel().getProperty(s);
			k.setProperty("/appState", p);
			this.getOwnerComponent().updateAppStateFromAppStateModel();
			W.handleOrderSelection(this.getRouter(), "object", i, this.sAppState);
		},
		updateOrderDetailModel: function (o) {
			var i = this.getView().getModel("DetailModel");
			var k = i.getData();
			k.orderId = o;
			k.selectedOrderData = this.getView().getModel().getProperty("/" + o);
			W.updateOrderDetailModel(i, k);
		},
		handleFilterChange: function (o) {
			this.handleAppstateUpdate(o);
		},
		handleTableItemSelection: function (o) {
			var t = o.getSource().getSelectedItems();
			var k, r, l, m, n, p;
			if (t.length === 0) {
				r = false;
				l = false;
				m = false;
				n = false;
				p = false;
			} else {
				r = true;
				l = true;
				m = true;
				n = true;
				p = true;
				for (var i = 0; i < t.length; i++) {
					k = t[i].getBindingContext().getObject();
					r = (r && (k.OrderIsCreated === "X" || k.OrderIsPartiallyReleased === "X") && k.OrderIsReleased === "");
					l = (l && k.OrderIsCreated === "X");
					m = (m && f.getButtonStatus(k));
					n = (n && f.getButtonStatus(k) && k.ManufacturingFeature === "EPO" && k.ManufacturingFeatureIsActive === "X" && k.OrderIsShopFloorOrder ===
						"X");
					p = (p && k.OrderIsShopFloorOrder === "");
				}
			}
			this.getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", r);
			this.getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", l);
			this.getModel("ActionButtonVisiblity").setProperty("/HoldButtonVisible", n);
			if (t.length > 1 || t.length === 0) {
				this.getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
				this.getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
				this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
				this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
			} else {
				this.getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", m);
				this.getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", p);
				if (n) {
					b.checkOprHasOpenOrdSpcfcChange(this.getModel("OSR"), k, function (D) {
						this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", true);
						if (D.results.length === 0) {
							this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", true);
							this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
						} else if (D.results.length > 0 && D.results[0].BillOfOperationsGroup !== "" && D.results[0].BillOfOperationsType !== "" && D.results[
								0].BillOfOperationsVariant !== "" && D.results[0].BillOfOperationsVersion !== "") {
							if (D.results[0].BillOfOperationsVersionStatus === "10") {
								this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
								this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", true);
							} else {
								this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", true);
								this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
							}
						}
						this.getModel("worklistView").setProperty("/oOrderSpecificChangeDetails", D.results[0]);
					}.bind(this));
				} else {
					this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
					this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", false);
				}
			}
		},
		handleReleaseButton: function (o) {
			var t = this._osmartTable.getTable().getSelectedItems();
			this.getModel("PRODORD").refresh(false, true);
			var l = this.getView().getModel();
			var C = !!this.getView().$().closest(".sapUiSizeCompact").length;
			this._oMessageManager.removeAllMessages();
			this._oErrorMessageToggleButton.setVisible(true);
			W.handleReleaseButton(t, l, C, this.getView().getModel("ActionButtonVisiblity"));
			var i = sap.ui.getCore().getEventBus();
			var k = this.getEventBusParameters();
			W.setEventBusParameters(i, k.ReleaseOrderAnyway.Channel, k.ReleaseOrderAnyway.Event);
		},
		handleEditQtyAndDateButton: function (o) {
			var i = this._osmartTable.getTable().getSelectedItems();
			var p = i[0].getBindingContext().sPath;
			for (var C = 0; C < i.length; C++) {
				var p = i[C].getBindingContext().sPath;
				var s = i[C].getBindingContext().oModel.getProperty(p).ManufacturingOrder;
				var k = i[C].getBindingContext().oModel.getProperty(p).MfgOrderPlannedTotalQty;
				var l = i[C].getBindingContext().oModel.getProperty(p).MfgOrderPlannedScrapQty;
				var m = i[C].getBindingContext().oModel.getProperty(p).ProductionUnit;
				var n = i[C].getBindingContext().oModel.getProperty(p).MfgOrderPlannedStartDate;
				var q = i[C].getBindingContext().oModel.getProperty(p).MfgOrderPlannedStartTime;
				var r = i[C].getBindingContext().oModel.getProperty(p).MfgOrderPlannedEndDate;
				var t = i[C].getBindingContext().oModel.getProperty(p).MfgOrderPlannedEndTime;
				var S = i[C].getBindingContext().oModel.getProperty(p).BasicSchedulingType;
				var u = i[C].getBindingContext().oModel.getProperty(p).SchedulingTypeName;
				var v = {
					ManufacturingOrder: s,
					MfgOrderPlannedTotalQty: k,
					MfgOrderPlannedScrapQty: l,
					ProductionUnit: m,
					MfgOrderPlannedStartDate: n,
					MfgOrderPlannedStartTime: q,
					MfgOrderPlannedEndDate: r,
					MfgOrderPlannedEndTime: t,
					BasicSchedulingType: S,
					SchedulingTypeName: u
				};
			}
			E.initAndOpen(v, this.getModel(), p);
			var w = this.getEventBusParameters();
			var x = sap.ui.getCore().getEventBus();
			E.setEventBusParameters(x, w.EditQtyAndDateDialog.Channel, w.EditQtyAndDateDialog.Event);
		},
		handleHoldButton: function (o) {
			var i = this._osmartTable.getTable().getSelectedItems();
			var p = i[0].getBindingContext().sPath;
			var s = i[0].getBindingContext().oModel.getProperty(p).ManufacturingOrder;
			var m = i[0].getBindingContext().oModel.getProperty(p).Material;
			var k = i[0].getBindingContext().oModel.getProperty(p).ProductionPlant;
			var H = [];
			for (var C = 0; C < i.length; C++) {
				var p = i[C].getBindingContext().sPath;
				var s = i[C].getBindingContext().oModel.getProperty(p).ManufacturingOrder;
				var m = i[C].getBindingContext().oModel.getProperty(p).Material;
				var k = i[C].getBindingContext().oModel.getProperty(p).ProductionPlant;
				var l = i[C].getBindingContext().oModel.getProperty(p).OrderOperationInternalID;
				var n = p.substring(51, 61);
				var q = p.substring(93, 101);
				var r = {
					ManufacturingOrder: s,
					ProductionPlant: k,
					Material: m,
					OrderOperationInternalID: "",
					WorkCenter: "",
					OrderInternalID: "",
					ShopFloorItem: 0
				};
				H.push(r);
			}
			var t = [h.HOLD.TYPE_ORDER, h.HOLD.TYPE_MATERIAL];
			g.initAndOpen(r, this.getModel("HoldModel"), t, H, h.HOLD.TYPE_ORDER, false);
			var u = this.getEventBusParameters();
			var v = sap.ui.getCore().getEventBus();
			g.setEventBusParameters(v, u.ApplyHoldDialog.Channel, u.ApplyHoldDialog.Event);
		},
		getEventBusParameters: function () {
			var o = {
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
			return o;
		},
		onReleaseOrderAnywayCallback: function (C, s, r) {
			var t = this.getView().byId("idMonitorOrdersTable").getTable().getSelectedItems();
			this.getModel("PRODORD").refresh(false, true);
			var l = this.getView().getModel();
			if (this.getView().$) {
				var i = !!this.getView().$().closest(".sapUiSizeCompact").length;
			}
			this._oMessageManager.removeAllMessages();
			this._oErrorMessageToggleButton.setVisible(true);
			W.handleReleaseButton(t, l, i, this.getView().getModel("ActionButtonVisiblity"), true);
		},
		onHoldSuccessfullyComplete: function (C, s, r) {
			var m, k;
			var t = this.getView().byId("idMonitorOrdersTable").getTable().getSelectedItems();
			if (r.success) {
				m = r.info;
				k = r.detail;
				d.show(m);
				for (var i = 0; i < t.length; i++) {
					t[i].setSelected(false);
				}
				this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/HoldButtonVisible", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
				this._osmartTable.rebindTable();
			} else {
				var l = !!this.getView().$().closest(".sapUiSizeCompact").length;
				m = r.info;
				this.getDynamicMessageBox(m, e.Icon.ERROR, "Error", [e.Action.CLOSE], this.getI18NText("ErrorOrderMSG"), k, l);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/HoldButtonVisible", true);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
			}
		},
		onEditQtyAndDateSuccessfullyComplete: function (C, s, r) {
			var m, k;
			var t = this.getView().byId("idMonitorOrdersTable").getTable().getSelectedItems();
			if (r.success) {
				if ((r.info) || (r.detail)) {
					this._osmartTable.rebindTable();
					m = r.info;
					k = r.detail;
					d.show(m);
					for (var i = 0; i < t.length; i++) {
						t[i].setSelected(false);
					}
				}
				this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
			} else {
				var l = !!this.getView().$().closest(".sapUiSizeCompact").length;
				m = r.info;
				k = r.detail;
				this.getDynamicMessageBox(m, e.Icon.ERROR, this.getI18NText("ErrorPopupTitle"), [e.Action.CLOSE], this.getI18NText("ErrorOrderMSG"),
					k, l);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", true);
				this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
			}
		},
		getDynamicMessageBox: function (m, i, s, k, l, n, C) {
			W.getDynamicMessageBox(m, i, s, k, l, n, C);
		},
		onPress: function (o) {
			this._showObject(o.getSource());
		},
		getI18NText: function (i, v) {
			return W.getI18NText(i, v);
		},
		handleSaveVariant: function (o) {
			T.saveVariantAsTile(o, this, "idMonitorOrdersTable");
		},
		setCustomFiltersData: function () {
			var l = {};
			l.issues = [{
				id: "All",
				name: this.getI18NText("AllIssues")
			}, {
				id: "Delay",
				name: this.getI18NText("Delay")
			}, {
				id: "ComponentIssue",
				name: this.getI18NText("ComponentIssue")
			}, {
				id: "QuantityIssue",
				name: this.getI18NText("QuantityIssue")
			}, {
				id: "QualityIssue",
				name: this.getI18NText("QualityIssue")
			}, {
				id: "ProductionHold",
				name: this.getI18NText("ProductionHold")
			}];
			l.delay = [{
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
			l.status = [{
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
			var i = new J(l);
			this.getView().setModel(i, "customFiltersModel");
		},
		handleIssueSelectionChange: function (o) {
			var s = o.getSource().getProperty("selectedKeys");
			this.handleMultiSelectionWithAllOption(o);
			this.updateAppStateforCustomFilters(s, "issuesFilter");
			var i = o.getSource().getSelectedItems();
			if (i.length > 0) {
				o.getSource().data("hasValue", true);
			} else {
				o.getSource().data("hasValue", false);
			}
		},
		handleDelaySelectionChange: function (o) {
			var l = o.getSource();
			var s = l.getSelectedKey();
			this.updateAppStateforCustomFilters(s, "delayFilter");
		},
		handleStatusSelectionChange: function (o) {
			var s = o.getSource().getProperty("selectedKeys");
			this.handleMultiSelectionWithAllOption(o);
			this.updateAppStateforCustomFilters(s, "statusFilter");
			var i = o.getSource().getSelectedItems();
			if (i.length > 0) {
				o.getSource().data("hasValue", true);
			} else {
				o.getSource().data("hasValue", false);
			}
		},
		handleMultiSelectionWithAllOption: function (o) {
			var l = o.getSource();
			var s = o.getParameter("changedItem").getProperty("key");
			var S = l.getProperty("selectedKeys");
			if (s && (s === "All") && (o.getParameter("selected"))) {
				l.setSelectedItems(l.getItems());
			} else if (s && (s === "All") && (!o.getParameter("selected"))) {
				l.setSelectedItems([]);
			} else {
				if (S.indexOf("All") !== -1) {
					S.splice(S.indexOf("All"), 1);
					l.setSelectedKeys(S);
				} else {
					var n = l.getItems().length;
					var i = S.length;
					var D = n - i;
					if (D === 1) {
						l.setSelectedItems(l.getItems());
					}
				}
			}
		},
		updateAppStateforCustomFilters: function (k, C) {
			var i = this.getOwnerComponent().getModel("AppState");
			i.getProperty("/appState")[C] = k;
			this.getOwnerComponent().updateAppStateFromAppStateModel();
		},
		handleBeforeRebindTable: function (o) {
			this.sAORFilterString = "";
			var m = o.getParameter("bindingParams");
			m.parameters.select = m.parameters.select + ",MfgOrderPlannedScrapQty";
			m.parameters.select = m.parameters.select + ",MfgOrderPlannedStartDate";
			m.parameters.select = m.parameters.select + ",MfgOrderPlannedStartTime";
			m.parameters.select = m.parameters.select + ",MfgOrderPlannedEndDate";
			m.parameters.select = m.parameters.select + ",MfgOrderPlannedEndTime";
			m.parameters.select = m.parameters.select + ",BasicSchedulingType";
			m.parameters.select = m.parameters.select + ",SchedulingTypeName";
			m.preventTableBind = false;
			this.ChangeSTableNoDataText();
			if (!this.bAORFilterFlag) {
				m.preventTableBind = true;
				return;
			}
			var t = m.filters;
			var i = m.sorter;
			if (m.sorter[0] === undefined) {
				var s = new sap.ui.model.Sorter("OrderStatusInternalID", true);
				i.push(s);
				var S = new sap.ui.model.Sorter("OrderStartDate", true);
				i.push(S);
				var k = new sap.ui.model.Sorter("MfgOrderScheduledStartTime", true);
				i.push(k);
				var l = new sap.ui.model.Sorter("MfgOrderActualStartTime", true);
				i.push(l);
			} else if (m.sorter[0] !== undefined) {
				var n = m.sorter[0].sPath;
				var u = new sap.ui.model.Sorter(n, true);
				i.push(u);
				var k;
				if (n === "MfgOrderScheduledStartDate") {
					if (m.sorter[0].bDescending === true) {
						k = new sap.ui.model.Sorter("MfgOrderScheduledStartTime", true);
						i.push(k);
					} else if (m.sorter[0].bDescending === false) {
						k = new sap.ui.model.Sorter("MfgOrderScheduledStartTime", false);
						i.push(k);
					}
				} else if (n === "MfgOrderActualStartDate") {
					if (m.sorter[0].bDescending === true) {
						k = new sap.ui.model.Sorter("MfgOrderActualStartTime", true);
						i.push(k);
					} else if (m.sorter[0].bDescending === false) {
						k = new sap.ui.model.Sorter("MfgOrderActualStartTime", false);
						i.push(k);
					}
				} else if (n === "MfgOrderScheduledEndDate") {
					if (m.sorter[0].bDescending === true) {
						k = new sap.ui.model.Sorter("MfgOrderScheduledEndTime", true);
						i.push(k);
					} else if (m.sorter[0].bDescending === false) {
						k = new sap.ui.model.Sorter("MfgOrderScheduledEndTime", false);
						i.push(k);
					}
				} else if (n === "MfgOrderConfirmedEndDate") {
					if (m.sorter[0].bDescending === true) {
						k = new sap.ui.model.Sorter("MfgOrderConfirmedEndTime", true);
						i.push(k);
					} else if (m.sorter[0].bDescending === false) {
						k = new sap.ui.model.Sorter("MfgOrderConfirmedEndTime", false);
						i.push(k);
					}
				}
			}
			var p = A.updateAORFilters(this);
			var q = this.updateIssueCustomFilter();
			var r = this.updateDelayFilter();
			if (this.bAssignDefaultStatusFilter) {
				var v = ["1", "2", "3", "5", "6", "7", "8"];
				var C = this._oSmartFilter.getControlByKey("CustomStatus");
				if (this.getOwnerComponent() && this.getOwnerComponent().getModel("AppState") && this._bInitialLoadFilterAppStateCheck === true) {
					var w = this.getOwnerComponent().getModel("AppState");
					if (w.getProperty("/appState").statusFilter && w.getProperty("/appState").statusFilter.length > 0) {
						v = w.getProperty("/appState").statusFilter;
						this._bInitialLoadFilterAppStateCheck = false;
					} else {
						this._bInitialLoadFilterAppStateCheck = false;
					}
				}
				if (this._oVariantMgt.getCurrentVariantId() !== "") {
					var D = this._oSmartFilter.getFilterData();
					if (D) {
						var x = D["_CUSTOM"];
						if (x) {
							if (x.Status) {
								v = x.Status;
							}
						}
					}
				}
				if (C) {
					C.setSelectedKeys(v);
				} else {
					this.getView().byId("idCustomStatusMultiSelectBox").setSelectedKeys(v);
				}
				this.bAssignDefaultStatusFilter = false;
			}
			var y = this.updateStatusFilter();
			var z = new sap.ui.model.Filter([], true);
			if (r.aFilters.length > 0) {
				z.aFilters.push(r);
			}
			if (q.aFilters.length > 0) {
				z.aFilters.push(q);
			}
			if (y.aFilters.length > 0) {
				z.aFilters.push(y);
			}
			var G = this.getOwnerComponent().getModel();
			if (p.aFilters.length > 0 && G && G.getServiceMetadata()) {
				var H = G.oMetadata;
				var K = G.getServiceMetadata().dataServices.schema[0].entityType;
				var L = "";
				for (var Q = 0; Q < K.length; Q++) {
					if (G.getServiceMetadata().dataServices.schema[0].entityType[Q].name === "C_ManageProductionOrderType") {
						L = G.getServiceMetadata().dataServices.schema[0].entityType[Q];
					}
				}
				this.sAORFilterString = sap.ui.model.odata.ODataUtils.createFilterParams(p, H, L);
				this.sAORFilterString = this.sAORFilterString.replace("$filter=", "");
				z.aFilters.push(p);
			}
			if (t[0] && t[0].aFilters) {
				var U = t[0];
				t[0] = new sap.ui.model.Filter([U, z], true);
			} else {
				t.push(z);
			}
		},
		updateStatusFilter: function () {
			var o = new sap.ui.model.Filter([], false);
			var s = [];
			if (this._oSmartFilter.getControlByKey("CustomStatus")) {
				s = this._oSmartFilter.getControlByKey("CustomStatus").getSelectedKeys();
			} else {
				s = this.getView().byId("idCustomStatusMultiSelectBox").getSelectedKeys();
			}
			for (var i = 0; s.length > i; i++) {
				if (s[i]) {
					if (s[i] !== "All") {
						o.aFilters.push(new sap.ui.model.Filter("OrderStatusInternalID", sap.ui.model.FilterOperator.EQ, s[i]));
					}
				}
			}
			return o;
		},
		updateIssueCustomFilter: function () {
			var o = new sap.ui.model.Filter([], false);
			var s = [];
			if (this._oSmartFilter.getControlByKey("CustomIssue")) {
				s = this._oSmartFilter.getControlByKey("CustomIssue").getSelectedKeys();
			}
			for (var i = 0; s.length > i; i++) {
				if (s[i]) {
					if (s[i] === "Delay" || s[i] === "All") {
						o.aFilters.push(new sap.ui.model.Filter("OrderExecutionStartIsLate", sap.ui.model.FilterOperator.Contains, "X"));
						o.aFilters.push(new sap.ui.model.Filter("OrderExecutionEndIsLate", sap.ui.model.FilterOperator.Contains, "X"));
					} else if (s[i] === "QuantityIssue" || s[i] === "All") {
						o.aFilters.push(new sap.ui.model.Filter("OrderYieldDeviationQty", sap.ui.model.FilterOperator.LT, 0));
					} else if (s[i] === "ComponentIssue" || s[i] === "All") {
						o.aFilters.push(new sap.ui.model.Filter("OrderHasMissingComponents", sap.ui.model.FilterOperator.Contains, "X"));
					} else if (s[i] === "QualityIssue" || s[i] === "All") {
						o.aFilters.push(new F("OrderHasQualityIssue", sap.ui.model.FilterOperator.Contains, "X"));
						o.aFilters.push(new F("InspHasRejectedCharc", sap.ui.model.FilterOperator.Contains, "X"));
						o.aFilters.push(new F("InspHasRejectedInspSubset", sap.ui.model.FilterOperator.Contains, "X"));
						o.aFilters.push(new F("InspHasRejectedInspLot", sap.ui.model.FilterOperator.Contains, "X"));
					} else if (s[i] === "ProductionHold" || s[i] === "All") {
						o.aFilters.push(new sap.ui.model.Filter("OrderHasProductionHold", sap.ui.model.FilterOperator.Contains, "X"));
					}
				}
			}
			return o;
		},
		updateDelayFilter: function () {
			var s = [];
			if (this._oSmartFilter.getControlByKey("CustomDelay")) {
				s = this._oSmartFilter.getControlByKey("CustomDelay").getSelectedKey();
			}
			var o = new sap.ui.model.Filter([], false);
			if (s && s.length > 0) {
				o.aFilters.push(new sap.ui.model.Filter("ExecutionEndLatenessInHours", sap.ui.model.FilterOperator.GT, s));
				o.aFilters.push(new sap.ui.model.Filter("ExecutionStartLatenessInHours", sap.ui.model.FilterOperator.GT, s));
			}
			return o;
		},
		handleVariantFetch: function () {
			var v = this.byId("idSmartVManagement");
			var V = v.getVariantItems();
			var s = null;
			var i = null;
			var k = [];
			if (V.length > 0) {
				for (var C = 0; C < V.length; C++) {
					i = V[C].getKey();
					s = V[C].getText();
					var o = {
						vKey: i,
						vName: s
					};
					k.push(o);
				}
			}
			this._aVariants = k;
		},
		handleVariantLoad: function () {
			var D = this._oSmartFilter.getFilterData();
			if (D) {
				var C = D["_CUSTOM"];
				if (C) {
					if (C.Issues) {
						this._oSmartFilter.getControlByKey("CustomIssue").setSelectedKeys(C.Issues);
					} else {
						this._oSmartFilter.getControlByKey("CustomIssue").setSelectedKeys([]);
					}
					if (C.Delay) {
						this._oSmartFilter.getControlByKey("CustomDelay").setSelectedKey(C.Delay);
					} else {
						this._oSmartFilter.getControlByKey("CustomDelay").setSelectedKey("");
					}
					if (C.Status) {
						this._oSmartFilter.getControlByKey("CustomStatus").setSelectedKeys(C.Status);
					} else {
						this._oSmartFilter.getControlByKey("CustomStatus").setSelectedKeys([]);
					}
				}
			}
			if (this._oVariantMgt.getCurrentVariantId() === "") {
				this.bAssignDefaultStatusFilter = true;
			}
		},
		handleBeforeVariantSave: function (o, G) {
			var C = {
				_CUSTOM: {
					Issues: "",
					Delay: "",
					Status: ""
				}
			};
			if (this._oSmartFilter.getControlByKey("CustomIssue").getSelectedKeys()) {
				var k = this._oSmartFilter.getControlByKey("CustomIssue").getSelectedKeys();
				C._CUSTOM.Issues = k;
			}
			if (this._oSmartFilter.getControlByKey("CustomDelay").getSelectedKey()) {
				C._CUSTOM.Delay = this._oSmartFilter.getControlByKey("CustomDelay").getSelectedKey();
			}
			if (this._oSmartFilter.getControlByKey("CustomStatus").getSelectedKeys()) {
				var s = this._oSmartFilter.getControlByKey("CustomStatus").getSelectedKeys();
				C._CUSTOM.Status = s;
			}
			var S = this.getView().byId("idMonitorOrdersTable");
			var l = this._oSmartFilter.getFilterData();
			l._CUSTOM = C._CUSTOM;
			var D = this._oVariantMgt.currentVariantGetModified();
			var v = this._oSmartFilter.getBasicSearchControl().getValue();
			this._oSmartFilter.setFilterData(l, true);
			if (v !== "") {
				this._oSmartFilter.getBasicSearchControl().setValue(v);
			}
			if (D !== this._oVariantMgt.currentVariantGetModified()) {
				this._oVariantMgt.currentVariantSetModified(D);
				this._callHandleAppStateUpdate();
			}
			var t = S.getTable().getSelectedItems();
			for (var i = 0; i < t.length; i++) {
				t[i].setSelected(false);
			}
			this._oOrderReleaseButton.setEnabled(false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/ReleaseButtonEditable", false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/EditButtonEditable", false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/EditQtyAndDateButtonEditable", false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/HoldButtonVisible", false);
			this.getView().getModel("ActionButtonVisiblity").setProperty("/RereadButtonEditable", false);
			if (S.getTable().getShowOverlay()) {
				if (!G) {
					this._osmartTable.rebindTable();
				}
			}
			var m = this.getOwnerComponent().getModel("AppState");
			var p = m.getProperty("/appState");
			p.VariantTableState = JSON.stringify(S.fetchVariant());
			m.setProperty("/appState", p);
			this.getOwnerComponent().updateAppStateFromAppStateModel();
		},
		handleAfterVariantSave: function (o) {
			var s = "";
			var S = this.getView().byId("idMonitorOrdersTable");
			if (S.getTable().getBindingInfo('items')) {
				s = S.getTable().getBindingInfo('items').binding.sFilterParams;
			}
			T.updatePersonalizationContainer(this, this.getView().byId("idMonitorOrdersTable").getEntitySet(), s);
			this.bCreateTileSelected = false;
			this.handleAppstateUpdate(o);
			if (this._osmartTable.getTable().getShowOverlay()) {
				this._osmartTable.getTable().setShowOverlay(false);
			}
		},
		handleManageVariant: function (o) {
			T.manageVariant(o, this);
		},
		handleSelectVariant: function (o) {
			var s = this.getView().byId("idMonitorOrdersTable");
			var i = this.getOwnerComponent().getModel("AppState");
			var p = i.getProperty("/appState");
			jQuery.sap.delayedCall(1000, this, function () {
				p.VariantTableState = JSON.stringify(s.fetchVariant());
				i.setProperty("/appState", p);
				this._callHandleAppStateUpdate();
			});
		},
		loadInitialVariant: function () {
			var v = this._oVariantMgt;
			var V = this.sSelectedVariant;
			if (v && V !== "") {
				var s;
				var i = v.getVariantItems();
				for (var C = 0; C < i.length; C++) {
					if (i[C].getText() === V) {
						s = i[C].getKey();
						break;
					}
				}
				if (s) {
					v.setCurrentVariantId(s);
				}
			}
			this._oSmartFilter.determineFilterItemByName("CustomStatus").setLabelTooltip(this.getI18NText("StatusFilter"));
			this._oSmartFilter.determineFilterItemByName("CustomDelay").setLabelTooltip(this.getI18NText("DelayFilter"));
			this._oSmartFilter.determineFilterItemByName("CustomIssue").setLabelTooltip(this.getI18NText("IssueFilter"));
		},
		handleIconPress: function (o) {
			var m = this.getView().getModel();
			W.handleIconPress(o, this, m);
		},
		handleMaterialLinkPress: function (o) {
			var C = o.getSource().getBindingContext();
			var m = C.getModel();
			var p = m.getProperty("ProductionPlant", C);
			var s = m.getProperty("Material", C);
			W.handleMaterialLinkPress(o, this, s, p);
		},
		handleOrderNumberPress: function (o) {
			var s = o.getSource();
			var p = s.getBindingContext().sPath;
			var i = s.getModel().getProperty(p);
			var m = i.ManufacturingOrder || i.MRPElement;
			W.handleOrderNumberPress(o, this, m);
		},
		handleStatusLinkPress: function (o) {
			W.handleStatusLinkPress(o, this);
		},
		ChangeSTableNoDataText: function () {
			if (this.bAORDeleted) {
				this._osmartTable.setNoData(this.getI18NText("AORDeleted"));
				this._osmartTable.getTable().setNoDataText(this.getI18NText("AORDeleted"));
			} else {
				this._osmartTable.setNoData(this.getI18NText("AORSelected"));
				this._osmartTable.getTable().setNoDataText(this.getI18NText("AORSelected"));
			}
		},
		handleGOBtnPress: function (o) {
			this.handleBeforeVariantSave(undefined, "true");
		},
		_callHandleAppStateUpdate: function () {
			var o = {
				oSourceTemp: this._oSmartFilter,
				getSource: function () {
					return this.oSourceTemp;
				}
			};
			this.handleAppstateUpdate(o);
		},
		onExit: function () {
			var o = sap.ui.getCore().getEventBus();
			o.unsubscribe("AppState", "hanldeAppstateChanges", this.handleAppStateChanges, this);
			A.oAppSettingsButton.destroy();
			A.oAppSettingsButton = null;
			var i = this.getEventBusParameters();
			o.unsubscribe(i.ApplyHoldDialog.Channel, i.ApplyHoldDialog.Event, i.ApplyHoldDialog.Callback, this);
			o.unsubscribe(i.ReleaseOrderAnyway.Channel, i.ReleaseOrderAnyway.Event, i.ReleaseOrderAnyway.Callback, this);
		},
		handleEditPress: function () {
			var i = this._osmartTable.getTable().getSelectedItems();
			var p = i[0].getBindingContext().sPath;
			var o = i[0].getBindingContext().oModel.getProperty(p).ManufacturingOrder;
			W.handleEditPress(o);
		},
		handleRereadButton: function (o) {
			var t = this._osmartTable.getTable().getSelectedItems();
			this.getModel("PRODORD").refresh(false, true);
			var l = this.getView().getModel();
			var C = !!this.getView().$().closest(".sapUiSizeCompact").length;
			W.handleRereadButton(t, l, C, this.getView().getModel("ActionButtonVisiblity"));
		},
		handleBeforeExport: function (o) {
			var k = o.getParameter("exportSettings");
			var C = k.workbook.columns;
			var l = ["OrderHasProductionHold", "OrderExecutionStartIsLate", "OrderExecutionEndIsLate", "OrderHasMissingComponents",
				"OrderYieldDeviationQty", "OrderHasQualityIssue", "InspHasRejectedCharc", "InspHasRejectedInspSubset", "InspHasRejectedInspLot",
				"MfgOrderScheduledStartDate", "MfgOrderScheduledStartTime", "MfgOrderActualStartDate", "MfgOrderActualStartTime",
				"MfgOrderScheduledEndDate", "MfgOrderScheduledEndTime", "MfgOrderConfirmedEndDate", "MfgOrderConfirmedEndTime"
			];
			var n;
			for (var i = 0; i < l.length; i++) {
				var s = l[i];
				var t;
				var m;
				var p;
				if (s.indexOf("Date") > -1) {
					t = "date";
				} else if (s.indexOf("Time") > -1) {
					t = "time";
				} else if (s === "OrderYieldDeviationQty") {
					t = "number";
				} else {
					t = "string";
				}
				for (var z = 0; z < C.length; z++) {
					var q = C[z];
					if (s === "OrderHasProductionHold" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("ProductionHold");
						break;
					} else if (s === "OrderExecutionStartIsLate" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("DelayOfStart");
						break;
					} else if (s === "OrderExecutionEndIsLate" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("DelayOfEnd");
						break;
					} else if (s === "OrderHasMissingComponents" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("ComponentIssue");
						break;
					} else if (s === "OrderYieldDeviationQty" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("QuantityIssue");
						break;
					} else if (s === "OrderHasQualityIssue" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("QualityIssue");
						break;
					} else if (s === "InspHasRejectedCharc" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("ChargeRejected");
						break;
					} else if (s === "InspHasRejectedInspSubset" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("SubsetRejected");
						break;
					} else if (s === "InspHasRejectedInspLot" && q.columnId.indexOf("idColumnIssue")) {
						m = "testing" + s + "Field";
						p = this.getI18NText("InspectionLotRejected");
						break;
					} else if (s === q.property && ((q.columnId.indexOf("idColumnStartDateTime") === -1 && q.columnId.indexOf("idColumnEndDateTime") ===
							-1))) {
						m = "testing" + s.split("MfgOrder")[1] + "Field";
						p = this.getI18NText(s.split("MfgOrder")[1]);
						C.splice(z, 1);
						break;
					} else if (q.columnId.indexOf("idColumnIssue") > -1) {
						C.splice(z, 1);
					} else {
						m = "testing" + s.split("MfgOrder")[1] + "Field";
						p = this.getI18NText(s.split("MfgOrder")[1]);
					}
				}
				n = this.getExcelWorkBookParameters(m, p, s, t);
				k.workbook.columns.push(n);
			}
		},
		getExcelWorkBookParameters: function (i, l, p, t) {
			var o = {
				columnId: i,
				displayUnit: false,
				falseValue: undefined,
				inputFormat: null,
				label: l,
				precision: undefined,
				property: p,
				scale: undefined,
				template: null,
				textAlign: "End",
				trueValue: undefined,
				type: t,
				unitProperty: undefined,
				width: ""
			};
			return o;
		},
		handleInspectionPress: function (o) {
			W.handleInspectionPress(o);
		},
		onPressOrdSpcfcChange: function () {
			var t = this,
				s = [],
				S = this._osmartTable.getTable().getSelectedItems(),
				i = S[0].getBindingContext().getObject().hasOwnProperty("BOOVersionChangeRecordIsRqd");
			var p = new jQuery.Deferred();
			if (i) {
				S.forEach(function (o) {
					s.push(o.getBindingContext().getObject());
				});
				p.resolve();
			} else {
				t.getView().getModel().read(S[0].getBindingContextPath(), {
					urlParameters: {
						$select: "BOOVersionChangeRecordIsRqd"
					},
					success: function (D) {
						p.resolve();
					},
					error: function () {
						p.resolve();
					}
				});
			}
			p.done(function () {
				j.initAndOpen({
					oHoldModel: t.getView().getModel("HoldModel"),
					oCRModel: t.getView().getModel("CR"),
					oOSRModel: t.getView().getModel("OSR"),
					oSelectedOrder: t._osmartTable.getTable().getSelectedItems()[0].getBindingContext().getObject(),
					oOrderSpecificChangeDetails: t.getView().getModel("worklistView").getProperty("/oOrderSpecificChangeDetails"),
					oCallBack: t.onOrdSpcfcChangeCallBack.bind(t),
					Ischangeforwholeorder: true
				});
			});
		},
		onPressDisplayOrdScpfcChange: function () {
			N.navToShopFloorRoutingChange(this.getView().getModel("worklistView").getProperty("/oOrderSpecificChangeDetails"));
		},
		onOrdSpcfcChangeCallBack: function (D) {
			this.getView().getModel("worklistView").setProperty("/oOrderSpecificChangeDetails", D);
			this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable", false);
			this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable", true);
		}
	});
});