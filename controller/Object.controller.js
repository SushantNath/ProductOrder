/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["i2d/mpe/orders/manages1/controller/BaseController","sap/i2d/mpe/lib/commons1/blocks/OrderDetailsHeaderHelper","sap/ui/model/resource/ResourceModel","sap/ui/model/json/JSONModel","sap/ui/core/routing/History","i2d/mpe/orders/manages1/model/formatter","sap/i2d/mpe/lib/commons1/utils/formatter","sap/i2d/mpe/lib/commons1/utils/util","sap/i2d/mpe/lib/commons1/fragments/OrderOperationStatus","sap/i2d/mpe/lib/popovers1/fragments/MaterialController","sap/m/MessageToast","sap/m/MessageBox","sap/ui/model/Filter","sap/i2d/mpe/lib/commons1/fragments/ApplyHoldDialog","sap/i2d/mpe/lib/commons1/utils/constants","sap/i2d/mpe/lib/qmcomps1/util/Defects","sap/i2d/mpe/lib/qmcomps1/util/Formatter","sap/i2d/mpe/lib/commons1/fragments/OrdSpcfcChange","sap/i2d/mpe/lib/commons1/utils/NavHelper"],function(B,O,R,J,H,f,c,r,d,M,e,g,F,A,h,D,i,j,N){"use strict";return B.extend("i2d.mpe.orders.manages1.controller.Object",{formatter:f,commonFormatter:c,reuseUtil:r,defectFormatter:i,onInit:function(){var o,v=new J({busy:true,delay:0});var E=sap.ui.getCore().getEventBus();E.subscribe("AppState","hanldeAppstateDetailChanges",this.hanldeAppstateDetailChanges,this);this._oOneOrderReleaseButton=this.getView().byId("idOneOrderReleaseButton");this.getRouter().getRoute("object").attachPatternMatched(this._handleRouteMatched,this);o=this.getView().getBusyIndicatorDelay();this.setModel(v,"objectView");this.getOwnerComponent().getModel().metadataLoaded().then(function(){v.setProperty("/delay",o);});var a=this.getView().byId("idOrderObjectPageLayout");f.setObjectPageLayoutReference(a);c.setObjectPageLayoutReference(a);r.setObjectPageRefrence(this);var s=new J();this.getView().setModel(s,"shopflooritems");var b=this.getOwnerComponent().getModel("DetailModel");var k=b.getData();if(k.bEnableAutoBinding){this._bDetailsScreenInitialLoad=true;}else{this._bDetailsScreenInitialLoad=false;}this.setModel(new J({"EditButtonVisible":false,"ConfirmButtonVisible":false,"bIsDisplayOrderSpecificHoldAvailable":false,"bIsDisplayOrderSpecificHoldNavigable":false,"bIsOrderSpecificHoldAvailable":false}),"ActionButtonVisiblity");if(sap.ushell&&sap.ushell.Container){var S=[];S.push("#ProductionOrder-change");S.push("#ShopFloorRouting-change");sap.ushell.Container.getService("CrossApplicationNavigation").isIntentSupported(S).done(function(C){if(C){this.getModel("ActionButtonVisiblity").setProperty("/EditButtonVisible",C["#ProductionOrder-change"].supported);this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldNavigable",C["#ShopFloorRouting-change"].supported);}}.bind(this)).fail(function(){jQuery.sap.log.error("Reading intent data failed.");this.getModel("ActionButtonVisiblity").setProperty("/EditButtonVisible",true);this.getModel("ActionButtonVisiblity").setProperty("/ConfirmButtonVisible",true);this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldNavigable",true);});}else{this.getModel("ActionButtonVisiblity").setProperty("/EditButtonVisible",true);this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldNavigable",true);}O.onInit(this._oOneOrderReleaseButton,a,this.getView());var l=this.getEventBusParameters();var E=sap.ui.getCore().getEventBus();E.subscribe(l.ApplyHoldDialog.Channel,l.ApplyHoldDialog.Event,l.ApplyHoldDialog.Callback,this);E.subscribe(l.ReleaseOrderAnyway.Channel,l.ReleaseOrderAnyway.Event,l.ReleaseOrderAnyway.Callback,this);A.setEventBusParameters(E,l.ApplyHoldDialog.Channel,l.ApplyHoldDialog.Event);this._DefectsClass=new D();},onNavToDefect:function(E){this._DefectsClass.onNavToDefect(E);},defectsCallbackFn:function(a){if(a.length>0&&a[0].to_ShopFloorItem){this._DefectsClass.setVisibleColumns(true);}},getOrderDetailPageI18nModel:function(){var I=jQuery.sap.getModulePath("sap.i2d.mpe.lib.commons1")+"/"+"i18n/i18n.properties";var o=new R({bundleUrl:I});return o;},getOrderNumber:function(m){return O.getOrderNumber(m);},getI18NText:function(a,v){return O.getI18NText(a,v);},_handleRouteMatched:function(E){var o=E.getParameter("arguments").orderId;this.gsOrderId=o;this.iAppState=E.getParameter("arguments").iAppState;this.getModel().metadataLoaded().then(function(){this._bindView("/"+o);}.bind(this));this.updateOrderModel();var a=E.getParameter("arguments").iAppState;var C=E.getParameter("config").name;this.getOwnerComponent().extractInnerAppStateFromURL(a,C,o);},_bindView:function(o){var t=this;var v=this.getModel("objectView"),a=this.getModel();a.setUseBatch(false);this.getView().bindElement({path:o,events:{change:this._onBindingChange.bind(this),dataRequested:function(){t.getModel().metadataLoaded().then(function(){v.setProperty("/busy",true);});},dataReceived:function(b){var C=b.getParameters().data;if(f.getFeatureAvailability(C.MfgFeatureIsActiveInAnyPlant)){t._DefectsClass.setProperties(t,t.getView().getBindingContext());t._DefectsClass.setFilters(C.ManufacturingOrder);t._DefectsClass.checkExistingDefects();}v.setProperty("/busy",false);}}});},_onBindingChange:function(a,b){var v=this.getView(),V=this.getModel("objectView"),E=v.getElementBinding(),C=this.getView().getBindingContext().getObject();if(!E.getBoundContext()){this.getRouter().getTargets().display("objectNotFound");return;}if(this._bDetailsScreenInitialLoad===false){this.rebindAllTablesOfAllBlocks();}else{var s=this.getView().getModel("shopflooritems");var p=f.getFeatureAvailability(C.MfgFeatureIsActiveInAnyPlant);if(!p){s.setData([]);}else{s.setData([""]);}this._bDetailsScreenInitialLoad=false;}if(C.OrderIsShopFloorOrder==="X"&&f.getButtonStatus(C)){r.checkOprHasOpenOrdSpcfcChange(this.getModel("OSR"),C,function(o){if(o.results.length===0){this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable",true);this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable",false);}else if(o.results.length>0&&o.results[0].BillOfOperationsGroup!==""&&o.results[0].BillOfOperationsType!==""&&o.results[0].BillOfOperationsVariant!==""&&o.results[0].BillOfOperationsVersion!==""){if(o.results[0].BillOfOperationsVersionStatus==="10"){this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable",false);this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable",true);}else{this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable",true);this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable",false);}}this.getModel("objectView").setProperty("/oOrderSpecificChangeDetails",o.results[0]);}.bind(this));}else{this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable",false);this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable",false);}V.setProperty("/busy",false);},updateOrderModel:function(){var m=this.getView().getModel("DetailModel");var o=m.getData();o.orderId=this.gsOrderId;m.setData(o);var a=this.getOwnerComponent().getModel("AppState");var p=a.getProperty("/appState");p.detailPage=o;this.getOwnerComponent().updateAppStateFromAppStateModel();},rebindAllTablesOfAllBlocks:function(){var b=this.getView().getBindingContext();var m=this.getView().getModel();var a=m.getProperty("MfgFeatureIsActiveInAnyPlant",b);var p=f.getFeatureAvailability(a);O.rebindAllTablesOfAllBlocks(p);if(!p){var s=this.getView().getModel("shopflooritems");s.setData([]);}},handleEditOrderPress:function(){var o=this.getView().getBindingContext().getObject().ManufacturingOrder;O.handleEditOrderPress(o);},handleConfirmOrderPress:function(E){var o=E.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;var p={"CORUF-AUFNR":o};var a=sap.ushell&&sap.ushell.Container&&sap.ushell.Container.getService;var C=a&&a("CrossApplicationNavigation");var s="ProductionOrderConfirmation";var b="createOrderConfirmation";O.handleConfirmOrderPress(p,C,s,b);},handleStatusLinkPress:function(E){O.handleStatusLinkPress(E,this);},handleMaterialLinkPress:function(E){var C=E.getSource().getBindingContext();var m=C.getModel();var p=m.getProperty("ProductionPlant",C);var s=m.getProperty("Material",C);O.handleMaterialLinkPress(E,this,s,p);},handleWorkCenterPress:function(E){O.handleWorkCenterPress(E,this);},hanldeAppstateDetailChanges:function(E,a,o){var m=this.getOwnerComponent().getModel("DetailModel");var b=m.getData();b.orderId=o.orderId;if(o.selectedOrderData){b.selectedOrderData=o.selectedOrderData;}m.setData(b);},onExit:function(){var E=sap.ui.getCore().getEventBus();E.unsubscribe("AppState","hanldeAppstateDetailChanges",this.hanldeAppstateDetailChanges,this);var o=this.getEventBusParameters();E.unsubscribe(o.ApplyHoldDialog.Channel,o.ApplyHoldDialog.Event,o.ApplyHoldDialog.Callback,this);E.unsubscribe(o.ReleaseOrderAnyway.Channel,o.ReleaseOrderAnyway.Event,o.ReleaseOrderAnyway.Callback,this);},handleReleaseOrderPress:function(E){var o=E.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;this.getModel("PRODORD").refresh(false,true);var l=this.getView().getModel();var C=!!this.getView().$().closest(".sapUiSizeCompact").length;var a=this.getModel("HoldModel");this.oIssuesBlock=this.byId("idIssuesBlock-Collapsed");this.oIssuesBlock.oParentBlock=this.getView().byId("idIssuesSubSection");O.handleReleaseOrderPress(o,l,this.oIssuesBlock,C,a);var b=sap.ui.getCore().getEventBus();var k=this.getEventBusParameters();O.setEventBusParameters(b,k.ReleaseOrderAnyway.Channel,k.ReleaseOrderAnyway.Event);},handleOrderHoldButton:function(E){var C=E.getSource().getBindingContext();var m=C.getModel();var o=E.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;var p=m.getProperty("ProductionPlant",C);var s=m.getProperty("Material",C);var l=this.getView().getModel();var b=!!this.getView().$().closest(".sapUiSizeCompact").length;this.oIssuesBlock=this.byId("idIssuesBlock-Collapsed");this.oIssuesBlock.oParentBlock=this.getView().byId("idIssuesSubSection");var a={ManufacturingOrder:o,ProductionPlant:p,Material:s};var k=[h.HOLD.TYPE_ORDER,h.HOLD.TYPE_MATERIAL];A.initAndOpen(a,this.getModel("HoldModel"),k,undefined,h.HOLD.TYPE_ORDER,false);},getEventBusParameters:function(){var E={ApplyHoldDialog:{Channel:"sap.i2d.mpe.orders.manages1.Worklist",Event:"onHoldSuccessfullyApplied",Callback:this.onHoldSuccessfullyComplete},ReleaseOrderAnyway:{Channel:"sap.i2d.mpe.orders.manages1.Object",Event:"onReleaseOrderAnywayAppliedDetails",Callback:this.onReleaseOrderAnywayCallback}};return E;},onReleaseOrderAnywayCallback:function(C,E,o){var s=this.getView().getModel().oData[this.gsOrderId].ManufacturingOrder;this.getModel("PRODORD").refresh(false,true);var l=this.getView().getModel();var b;if(this.getView().$){b=!!this.getView().$().closest(".sapUiSizeCompact").length;}var a=this.getModel("HoldModel");this.oIssuesBlock=this.byId("idIssuesBlock-Collapsed");this.oIssuesBlock.oParentBlock=this.getView().byId("idIssuesSubSection");O.handleReleaseOrderPress(s,l,this.oIssuesBlock,b,a,true);O.setEventBusParameters();},onHoldSuccessfullyComplete:function(C,E,o){var m,s;if(o.success){m=o.info;e.show(m);this.rebindAllTablesOfAllBlocks();}else{var b=!!this.getView().$().closest(".sapUiSizeCompact").length;m=o.info;this.getDynamicMessageBox(m,g.Icon.ERROR,"Error",[g.Action.CLOSE],"ErrorOrderMSG",s,b);}},getDynamicMessageBox:function(m,a,s,b,k,l,C){O.getDynamicMessageBox(m,a,s,b,k,l,C);},handleRereadButtonPress:function(E){var o=E.getSource().getModel().oData[this.gsOrderId].ManufacturingOrder;this.getModel("PRODORD").refresh(false,true);var l=this.getView().getModel();var C=!!this.getView().$().closest(".sapUiSizeCompact").length;var v=this.getModel("objectView");var a=this.getModel("HoldModel");this.oIssuesBlock=this.byId("idIssuesBlock-Collapsed").getController();O.handleRereadButtonPress(o,l,this.oIssuesBlock,C,v,a);},onPressGoToConfigPage:function(E){var C=E.getSource().getBindingContext();var m=C.getModel();var o=this.getView().getBindingContext().getObject().ManufacturingOrder;var p=m.getProperty("ProductConfiguration",C);var a=sap.ui.core.UIComponent.getRouterFor(this);a.navTo("Configuration",{orderId:o});},onPressOrdSpcfcChange:function(){j.initAndOpen({oHoldModel:this.getView().getModel("HoldModel"),oCRModel:this.getView().getModel("CR"),oOSRModel:this.getView().getModel("OSR"),oSelectedOrder:this.getView().getBindingContext().getObject(),oOrderSpecificChangeDetails:this.getView().getModel("objectView").getProperty("/oOrderSpecificChangeDetails"),oCallBack:this.onOrdSpcfcChangeCallBackObject.bind(this),Ischangeforwholeorder:true});},onPressDisplayOrdScpfcChange:function(E){N.navToShopFloorRoutingChange(this.getView().getModel("objectView").getProperty("/oOrderSpecificChangeDetails"));},onOrdSpcfcChangeCallBackObject:function(o){this.getView().getModel("objectView").setProperty("/oOrderSpecificChangeDetails",o);this.getModel("ActionButtonVisiblity").setProperty("/bIsOrderSpecificHoldAvailable",false);this.getModel("ActionButtonVisiblity").setProperty("/bIsDisplayOrderSpecificHoldAvailable",true);}});});
