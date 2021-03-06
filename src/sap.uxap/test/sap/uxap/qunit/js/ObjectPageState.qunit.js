/*global QUnit,sinon*/

(function ($, QUnit, sinon, Importance) {
	"use strict";

	jQuery.sap.registerModulePath("view", "view");

	function createPage(key) {

		var oOPL = new sap.uxap.ObjectPageLayout(key,{
			headerTitle:new sap.uxap.ObjectPageHeader({
				objectTitle:key,
				actions:[
					new sap.uxap.ObjectPageHeaderActionButton({
						icon:'sap-icon://refresh'
					}),
					new sap.uxap.ObjectPageHeaderActionButton({
						icon:'sap-icon://sys-help',
						tooltip:'Show help'
					})
				]
			}),
			headerContent:[
				new sap.m.Toolbar({
					content:[
						new sap.m.Button({
							text:'Button 1',
							type:sap.m.ButtonType.Emphasized
						}),
						new sap.m.Button({
							text:'Button 2',
							type:sap.m.ButtonType.Emphasized
						})
					]
				}).addStyleClass('borderless')
			],
			sections:[
				new sap.uxap.ObjectPageSection({
					showTitle:false,
					subSections:[
						new sap.uxap.ObjectPageSubSection({
							blocks:[
								new sap.m.Text({text:'Page ' + key}),
								new sap.m.Text({text:'More to come...'})
							]
						})
					]
				})
			]
		});

		return oOPL;
	}

	QUnit.test("Show/Hide Page preserves expanded state", function (assert) {

		var oPage1 = createPage("page1"),
			oPage2 = createPage("page2"),
			oApp = new sap.m.App({pages: [oPage1, oPage2],
									initialPage: oPage1});
		oApp.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();

		assert.ok(oPage1._bStickyAnchorBar === false, "page is expanded");

		var done = assert.async();
		oApp.attachAfterNavigate(function(oEvent) {
			assert.ok(oPage1._bStickyAnchorBar === false, "page is still expanded");
			if (oApp.getCurrentPage().getId() === "page1") {
				done();
			}
		});

		oApp.to(oPage2); //hide page1
		oApp.to(oPage1); //back page1
	});

	QUnit.module("Invalidation");

	QUnit.test("do not invalidate parent upon first rendering", function (assert) {

		var oTextArea = new sap.m.TextArea({rows: 5, width: "100%", value: "12345678901234567890", growing: true}),
			oPage = new sap.m.Page("page01", {content: [oTextArea]}),
			oObjectPageLayout = new sap.uxap.ObjectPageLayout("page02", {
				sections: new sap.uxap.ObjectPageSection({
					subSections: [
						new sap.uxap.ObjectPageSubSection({
							blocks: [new sap.m.Text({text: "test"})]
						})
					]
				})
			}),
			oApp = new sap.m.App({
				pages: [
					oPage, oObjectPageLayout
				]
			}),
			done = assert.async();

		sinon.spy(oApp, "invalidate");

		oTextArea.addEventDelegate({
			onAfterRendering: function(oEvent) {
				assert.strictEqual(oTextArea.getDomRef().scrollHeight > 0, true, "textarea on after rendering has scrollHeight greater than 0");
				assert.strictEqual(oApp.invalidate.called, false, "invalidate not called");
			}
		});

		oApp.placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();


		var afterBackToPage1 = function() {
				done();
			},afterNavigatePage2 = function() {
				oApp.detachAfterNavigate(afterNavigatePage2);
				oApp.attachAfterNavigate(afterBackToPage1);
				oApp.to("page01");
			};

		oApp.attachAfterNavigate(afterNavigatePage2);

		oApp.to("page02");
	});


	QUnit.module("Sections invalidation", {
		beforeEach: function () {
			this.oView = sap.ui.xmlview("UxAP-ObjectPageState", {
				viewName: "view.UxAP-ObjectPageState"
			});
			this.oObjectPage = this.oView.byId("ObjectPageLayout");

			this.oView.placeAt('content');
			sap.ui.getCore().applyChanges();
		},
		afterEach: function () {
			this.oView.destroy();
			this.oObjectPage = null;
		}
	});

	QUnit.test("changes to hidden sections update the anchor bar", function (assert) {
		//setup
		var oPage = this.oObjectPage;
		oPage.setUseIconTabBar(true);
		var done = assert.async();

		setTimeout(function() {

			//act
			oPage.getSections()[1].setTitle("Changed");

			setTimeout(function() {

				var oTabButton = oPage.getAggregation("_anchorBar").getContent()[1];
				assert.ok(oTabButton.getText() === "Changed", "section title is updated in the anchorBar");
				done();
			}, 1000); //calc delay

		}, 1000); //dom calc delay
	});

	QUnit.module("update content size", {
		beforeEach: function () {
			this.oView = sap.ui.xmlview("UxAP-ObjectPageState", {
				viewName: "view.UxAP-ObjectPageState"
			});
			this.oObjectPage = this.oView.byId("ObjectPageLayout");
			this.oObjectPage.setSelectedSection(this.oObjectPage.getSections()[1].getId());

			this.oView.placeAt('content');
			sap.ui.getCore().applyChanges();
		},
		afterEach: function () {
			this.oView.destroy();
			this.oObjectPage = null;
		}
	});

	QUnit.test("expand content below selected section updates layout", function (assert) {
		//setup
		var oPage = this.oObjectPage,
			oBlock = oPage.getSections()[2].getSubSections()[0].getBlocks()[0],
			done = assert.async();

		setTimeout(function() {
			//act
			oBlock.setHeight("600px"); //add 300px more
			setTimeout(function() {

				var sSelectedButtonId = oPage.getAggregation("_anchorBar").getSelectedButton(),
					oSelectedButton = sap.ui.getCore().byId(sSelectedButtonId),
					sSelectedSectionId = oPage.getSelectedSection(),
					oSelectedSection = sap.ui.getCore().byId(sSelectedSectionId);

				assert.strictEqual(oSelectedButton.getText(), oSelectedSection.getTitle(), "section selection is preserved in the anchorBar");
				done();
			}, 1000); //dom calc delay
		}, 1000); //dom calc delay
	});

	function sectionIsSelected(oPage, assert, oExpected) {
		var bSnapped = oExpected.bSnapped,
			iAnchorBarSelectionIndex = oExpected.iAnchorBarSelectionIndex,
			oAnchorBar = oPage.getAggregation("_anchorBar"),
			sSelectedBtnId = oAnchorBar.getSelectedButton(),
			oSelectedButton = sap.ui.getCore().byId(sSelectedBtnId),
			iSelectedBtnIndex = oAnchorBar.indexOfContent(oSelectedButton);

		assert.strictEqual(oPage._bStickyAnchorBar, bSnapped, "header snapped state is correct");
		assert.strictEqual(iSelectedBtnIndex, iAnchorBarSelectionIndex, "index of anchorBar selected button is correct");
	}

	function runParameterizedTests (bUseIconTabBar) {

		var sModulePrefix = bUseIconTabBar ? "IconTabBar" : "AnchorBar";

		QUnit.module(sModulePrefix + "Mode", {
			beforeEach: function () {
				this.oView = sap.ui.xmlview("UxAP-ObjectPageState", {
					viewName: "view.UxAP-ObjectPageState"
				});
				this.oObjectPage = this.oView.byId("ObjectPageLayout");
				this.oObjectPage.setUseIconTabBar(bUseIconTabBar);
				this.oView.placeAt('content');
			},
			afterEach: function () {
				this.oView.destroy();
				this.oObjectPage = null;
			}
		});


		QUnit.test("Delete first section", function (assert) {
			//setup
			var oPage = this.oObjectPage,
				oFirstSection = oPage.getSections()[0],
				done = assert.async(),
				fnOnDomReady = function() {
					// act
					oPage.removeSection(oFirstSection); /* remove first section */

					setTimeout(function() {
						sectionIsSelected(oPage, assert, {
							bSnapped: false,
							iAnchorBarSelectionIndex: 0
						});

						//cleanup
						oFirstSection.destroy();
						done();
					}, 0); //scroll delay
				};
			oPage.attachEventOnce("onAfterRenderingDOMReady", fnOnDomReady);
		});


		QUnit.test("Hide lower section", function (assert) {
			//setup
			var oPage = this.oObjectPage,
				oSection1 = oPage.getSections()[1],
				oSection1Subsection1 = oSection1.getSubSections()[1],
				done = assert.async(),
				fnOnDomReady = function() {
					oPage.scrollToSection(oSection1Subsection1.getId(), 0);

					setTimeout(function() {
						sectionIsSelected(oPage, assert, {
							bSnapped: true,
							iAnchorBarSelectionIndex: 1
						});

						// act
						oSection1.setVisible(false); /* hide subsection */
						sap.ui.getCore().applyChanges();

						sectionIsSelected(oPage, assert, {
							bSnapped: true,
							iAnchorBarSelectionIndex: 0
						});

						done();
					}, 0);
				};
			oPage.attachEvent("onAfterRenderingDOMReady", fnOnDomReady);
		});


		QUnit.test("Hide lower subSection", function (assert) {
			//setup
			var oPage = this.oObjectPage,
				oSection1Subsection1 = oPage.getSections()[1].getSubSections()[1],
				done = assert.async(),
				fnOnDomReady = function() {
					oPage.scrollToSection(oSection1Subsection1.getId(), 0);

					setTimeout(function() {

						sectionIsSelected(oPage, assert, {
							bSnapped: true,
							iAnchorBarSelectionIndex: 1
						});

						// act
						oSection1Subsection1.setVisible(false); /* hide subsection */
						sap.ui.getCore().applyChanges();

						sectionIsSelected(oPage, assert, {
							bSnapped: true,
							iAnchorBarSelectionIndex: 1
						});
						done();
					}, 0); //scroll delay
				};
			oPage.attachEvent("onAfterRenderingDOMReady", fnOnDomReady);
		});
	}

	var bUseIconTabBar = true;

	runParameterizedTests(bUseIconTabBar);
	runParameterizedTests(!bUseIconTabBar);

}(jQuery, QUnit, sinon, sap.uxap.Importance));
