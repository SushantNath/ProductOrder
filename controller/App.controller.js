/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["i2d/mpe/orders/manages1/controller/BaseController","sap/ui/model/json/JSONModel"],function(B,J){"use strict";return B.extend("i2d.mpe.orders.manages1.controller.App",{onInit:function(){var v,s,o=this.getView().getBusyIndicatorDelay();v=new J({busy:true,delay:0});this.setModel(v,"appView");s=function(){v.setProperty("/busy",false);v.setProperty("/delay",o);};this.getOwnerComponent().getModel().metadataLoaded().then(s);this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());}});});
