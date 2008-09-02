/*
 * jOWL_UI, User Interface Elements for jOWL, semantic javascript library
 * Creator - David Decraene
 * http://Ontologyonline.org
 */
(function($){

jOWL.UI = {
	broadcaster : function(){
		var listeners = new Array();
		this.addListener = function(obj){
			if(obj.constructor == Array){for(var i=0;i<obj.length;i++){add(obj[i]);}}
			else add(obj);
			function add(obj){if(obj.propertyChange != undefined) listeners.push(obj)}
			return this; };
		this.broadcast = function(item){ for(var i=0;i<listeners.length;i++){listeners[i].propertyChange(item);};}
		this.propertyChange = function(item){};
	},
	asBroadcaster : function(ui_elem){ ui_elem.broadcaster = jOWL.UI.broadcaster; ui_elem.broadcaster(); },
	/**Internal function, make it easier to create elements */
	getDiv : function(className, context, keep){
				var node = $("."+className, context)
					if(!keep) node.empty();
				if(!node.length) node = $("<div/>").addClass(className).appendTo(context);
				return node;
				},
	/** generate some pretty html for valuerestrictions on individuals, used by formresults, and individuals widget*/
	valueRestrictions : function(thing){
		var html = [];
		var rr = thing.valueRestrictions(true).JSON();
		for(x in rr){
			//add spaces when array
			var syntax = (x == "img") ? '<img src="'+rr[x]+'"/>' : "<span class='alt'>"+x+"</span>: "+rr[x];
			html.push($('<div/>').html(syntax).get(0));
		}
		return html;			
	}
}

/** 
WIDGETS 
all widgets implement propertyChange and addListener,
fire up a widget with jOWL content: widget.propertyChange(jOWLObject);
pattern for widgets: 
			add class owl_UI
			set object asBroadcaster
			overwrite the propertyChange function
*/
$.fn.extend({
		/* 
		owl_navbar
		options:
		*/
		owl_navbar: function(options){
			options = $.extend({}, options);
			var self = this;
			this.addClass("owl_navbar owl_UI");
			var content = $(".owl_UI_content", this).empty();
				if(!content.length) content = $("<div/>").addClass("owl_UI_content").appendTo(this);
				var parents =  $('<div class="owl_navbar_parents"/>').appendTo(content);
				var focus = $('<div/>').appendTo(content);
				var children = $('<div class="owl_navbar_children"/>').appendTo(content);
				var listnode = $('<span/>').css('cursor', 'pointer').click(function(){					
					var res = jOWL(this.title);
					if(res && res.type == 'owl:Class') { self.propertyChange(res); self.broadcast(res); }
					});

			jOWL.UI.asBroadcaster(this);

			this.propertyChange = function(item){
				if(item.type && item.type == 'owl:Class'){
					item.bind(focus); focus.addClass("owl_UI_focus"); 
					parents.empty().append(item.parents().bind(listnode));
					children.empty().append(item.children().bind(listnode));
				} 
			};

			return this;
		},
		owl_custom : function(func){
			var self = this;
			jOWL.UI.asBroadcaster(this);
			this.propertyChange = function(item){
				func(item, self);
			}
			return this;
		},
		/** 
		options: 
			time: responsetime to check for new keystrokes, default 500
			chars: number of characters needed before autocomplete starts searching, default 3
			focus: put cursor on the input field when loading, default false
			limit: limit size of result list to given amount, default 10
		*/
		owl_autocomplete : function(options){
				options = $.extend({time:500, chars:3, focus:false, limit:10, html : function(listitem, type, identifier, termarray){
					listitem.append($('<div class="type"/>').text(type));
					listitem.append($('<div class="name"/>').text(identifier));
					if(termarray.length) listitem.append($('<div class="terms"/>').text(termarray.join(', '))
								.prepend($('<span/>').addClass('termlabel').text("Terms: "))
								);
				}}, options);
				jOWL.UI.asBroadcaster(this);
				var self = this; var old = ''; var open = false; self.val('');
				var results = $('<ul class="owl_autocomplete_results"/>'); this.after(results);
				results.cache = {};
				results.isEmpty = function(){ for(x in results.cache) { return false; } return true; }
				results.close = function(){this.hide();}
				results.open = function(q, cache){
					this.show(); 
					if(q){
						if(!cache || results.isEmpty()) { 
							var opts = {};
							if(options.filter) $.extend(opts, { filter : options.filter}); 
							if(options.exclude) $.extend(opts, { exclude : options.exclude});
							results.cache = jOWL.query(q, opts); 
							}
						else { 
							var newcache = {};
							for(x in results.cache){
								var entry = results.cache[x]; 
								var found = false;
								var newentries = [];								
								if(x.searchMatch(q) > -1) found = true;
								for(var i = 0;i<entry.length;i++){
									if(entry[i].term.searchMatch(q) > -1) { found = true; newentries.push(entry[i]); }
								}
								if(found) newcache[x] = newentries;
								}
							results.cache = newcache;
							}
						this.populate(results.cache);
						}
				}
				results.populate = function(data){
					var res = this; this.empty(); var count =0; 
					for(x in data){
						if(count < options.limit){
							var item = data[x];
							var v = jOWL.isExternal(x);
							v = v ? v[1] : x;
							var list = $('<li/>').data("jowltype", x)
							.click(function(){self.broadcast(jOWL($(this).data("jowltype")));})
							.hover(function(){$(this).addClass('hover');}, function(){$(this).removeClass('hover');})
							.appendTo(res);
							var terms = [];
							for(var l = 0;l<item.length;l++){ 
								var found = false; var newterm = item[l].term;
								for(var y=0; y < terms.length;y++){ if(terms[y].toLowerCase() == newterm.toLowerCase()) found = true;}
								if(!found) terms.push(newterm);	
								}
							options.html(list, item[0].type, v, terms);

						}
						count++;
					}
				}

				setInterval(function(){
					var newvalue = self.val();
					var cache = true;
					if(old != newvalue){
						var longervalue = newvalue.length > old.length && newvalue.indexOf(old) == 0;
						if(!old) cache = false; //if previous entry was null input -> never cache
						old = newvalue; 
						if(newvalue.length < options.chars && open){results.close();open = false;}
						else if(newvalue.length >=options.chars && newvalue.length > 0){
							if(cache) cache = longervalue && newvalue.length > options.chars;
							results.open(newvalue, cache);
							open = true;
							}
						
					}
				}, options.time);

				self.bind('keyup', function(){ if(this.value.length == 0){ results.close();open = false;}})
				if(options.focus)self.bind('blur', function(){if(open){setTimeout(function(){results.close();}, 200);open = false;}});
				//timeout for registering clicks on results.
				self.bind('focus', function(){if(self.val().length != 0 && !open){results.open('', open);open = true;}});
				//reopen, but do not get results
				return this;
		},
		/*
		simple widget, use owl_propertyLens for more flexibility
		options: 
			title: display the owl:Class name on top, default true
		*/
		owl_individuals : function(options){
			options = $.extend({title: true, tooltip : false, html : jOWL.UI.valueRestrictions}, options);
			this.addClass('owl_indiv owl_UI');

			var content = $(".owl_UI_content", this).empty();
				if(!content.length) content = $("<div/>").addClass("owl_UI_content").appendTo(this);
			var title =  $('<div class="owl_UI_focus"/>').appendTo(content);
			var list = $('<div class="owl_indiv_list"/>').appendTo(content);

			jOWL.UI.asBroadcaster(this);

			this.propertyChange = function(item){
				if(item.type == 'owl:Class') { 
						if(options.title) title.html(item.label());
						var results = new jOWL.Ontology.Array();
						new jOWL.SPARQL_DL("Type(?x, concept)", {"concept": item})
							.execute({childDepth : 1, async: false, onComplete : function(r){
								$.each(r.results, function(i, n){results.push(n["?x"]);}); 
						}}); 
						var th = results.bind($('<div/>'), function(node, thing){
							if(options.tooltip && node.tooltip) 
								node.tooltip({ title: thing.label(), html : function(){ return options.html(thing);	} }); 
						});
						list.empty().append(th);						 
								
					}				
				};

			return this;
		},
		/** 
		Displays individuals found with a form, with tooltip functionality, in development
		options:
			html: function, with one argument == owl:Thing, needs to return an array of DOMElements, see jOWL.UI.valueRestrictions
			tooltip: show valuerestrictions when hovering over the result, true/false
		needed options:
			showtype
			tooltip yes/no
		*/
		owl_formResults : function(owl_form, options){
			options = $.extend({expandChildren: true, childDepth: 4, tooltip : true,
				html : jOWL.UI.valueRestrictions
				}, options);
			this.addClass('owl_indiv2 owl_UI');
			var self = this; //needs improvement
				var header = options.header || $('#resultheader', self);
				var loader = options.loader || $('#resultloader', self);
				var content = options.content || $('#results', self);
				var count = options.count ||  $('#resultcount', self);
			jOWL.UI.asBroadcaster(this);
			if(owl_form) owl_form.addListener(this);
			function setHeader(criteria){
				var h = "none selected."; 
				if(criteria.length > 0 ) {
					h = []; 
					$.each(criteria, function(){
						h.push("&lt;<b>"+this.property.name+'</b>&gt;'+' '+this.target.name);}); 
					h = h.join(', '); }
				header.html("<div>Selected Restrictions:</div>"+h);
			}

			function setResults(results){
				loader.hide();
				if(results.size() == 0) { content.append("No Results found matching your criteria."); return; }
				var resultlist = $('<ul/>').appendTo(content).css("width", "75%");
				results.each(function(thing, i){
					var th = thing.bind($('<li/>')).appendTo(resultlist); 
					if(options.tooltip && th.tooltip) th.tooltip({ title: thing.label(),	html : function(){ return options.html(thing);	} }); //end tooltip						
					else th.append(options.html(thing));
				});
				count.html('Results found: <b>'+results.size()+'</b>');

			}

			options.onLoad = setResults;

			this.propertyChange = function(item){					
					if(item.criteria) setHeader(item.criteria);
					content.empty();
					loader.show("normal", function(){ jOWL.getIndividuals(item.concept, item.criteria, options);}); 
					}

			return this;
		},
		/**
		options
			button: jquery element that will act as button
		*/
		owl_form : function(options){
			options = $.extend({}, options);
			this.addClass("owl_form owl_UI");
			var content = jOWL.UI.getDiv("owl_UI_content", this);
			var button = options.button || jOWL.UI.getDiv("owl_UI_form_button", this, true);				
			
			jOWL.UI.asBroadcaster(this);
			var self = this;
			this.concept = options.object || null;

			this.propertyChange = function(item){
					if(item.type == 'owl:Class') { self.concept = item; }
				};

			this.addSelect = function(criterium){
				var property = criterium.property;
				var targets = criterium.getTargets();
				if(targets){ 
					var div = $('<div/>').append(property.bind($("<div/>").css({color: "rgb(0, 94, 205)", cursor: "pointer"})).click(function(){$(this).parent().remove();}));
					var select = $('<select/>').css('width', 120); $.data(select.get(0), "OWL", property)
					targets.each(function(target, i){ 
						var html = $('<option/>'); select.append(target.bind(html)); $.data(html.get(0), "OWL", target);
						});
					content.append(div.append(select));
				}
			}
			function doSubmit(){
				var criteria =[];
				$('select', self).each(function(){ criteria.push({ property : $.data(this, "OWL"), target : $.data(this[this.selectedIndex], "OWL")}); });
				self.broadcast({ concept: self.concept, criteria : criteria});
				return criteria;
			}
			button.click(function(){ doSubmit(); });

			return this;
		
		},
		/** 
		options:
		rootThing: true/false - default false; if true then topnode is (owl) 'Thing'
		isStatic: true/false - default false; if static then selections will refresh the entire tree
		addChildren : true/false - default false; add a given objects children to the treeview as well
		onSelect: function that can be overwritten to specfy specific behavior when something is selected
		*/
		owl_treeview : function(options){	
			options = $.extend({isStatic: false, addChildren : false, rootThing : false, onSelect: function(item){}}, options);
			this.addClass("owl_tree owl_UI");	
			var content = jOWL.UI.getDiv("owl_UI_content", this);
			var tree = new Tree(content, null, options);
				jOWL.UI.asBroadcaster(tree);
				tree.propertyChange = function(item){if(item.type == 'owl:Class') TreeModel(item); };
			if(options.object) tree.propertyChange(options.object);

			function onSelect(item){
				var entry = $.data(item, "jOWL"); tree.broadcast(entry); if(options.isStatic) tree.propertyChange(entry);	
			}

			/** construct the hierarchy & make a tree of it */
			function TreeModel(owlobject){
				var h = owlobject.hierarchy();
				var root = options.rootThing ? tree.root(jOWL("Thing")) : tree.root(h);
				if(root.length) { 
					for(var i=0;i<root.length;i++){ traverse(root[i].invParents, root[i]);} 
					}
				else traverse(h, root);

				function traverse(itemarray, appendto){
					if(!itemarray) { 
						var leaf = $.data(appendto.name, "jOWL");
						if(options.addChildren && leaf) {
							appendto.jnode.addClass('focus');
							leaf.children().each(function(child){
								appendto.add(child);
							});
						}					
					}
					if(itemarray) itemarray.each(function(item){					
						var node = appendto.add(item);	traverse(item.invParents, node);
						item.invParents = null; //reset for later use
					});
				}			

			}

			/**
			var tree = $(selector).owl_treeview();
			var root = tree.root("node");
			root.add("node2").add("child");
			*/
			function Tree(node, treemodel, options){
				options = $.extend({isStatic:false, onSelect : function(item){}}, options);				
				var rack = $('<ul/>').addClass("owl_treeview").appendTo(node);
				/**item can be text, a jOWL object, or a jOWL array */
				this.root = function(item){
					var rt = null; //root
					rack.empty();  
					if(item && item.each) {
						rt = [];
						item.each(function(it){
							var x =  new fn.node(it, true); 
							x.wrapper.addClass("tv");
							x.jnode.appendTo(rack);
							x.invParents = it.invParents; it.invParents = null;	//reset for later use
							rt.push(x);
						}) 
						return rt;	
					}
					rt = new fn.node(text, true);						
					rt.wrapper.addClass("tv"); 
					rt.jnode.appendTo(rack);
					return rt;
				}

				var fn = {};
				fn.node = function(text, isRoot){ //creates a new node
					this.jnode = isRoot ? $('<li class="root"/>') :  $('<li class="tvi"/>');
					this.name = null;
					if(text){						
						this.name = $('<span class="name"/>');						
						if(typeof text == "string") this.name.html(text);
						else if(text.bind) { text.bind(this.name); $.data(this.name, "jOWL", text); }
						var n = this.name; 
						this.name.appendTo(this.jnode).click(function(){onSelect(n); options.onSelect(n); return false;});
					}
					
					this.wrapper = $('<ul/>').appendTo(this.jnode);
					var self = this;
						self.jnode.click(function(){toggle(); return false;});

					this.add = function(text){
						var nn = new fn.node(text);
						if(self.wrapper.children().length == 0) { toNode();	}//no children
						else { var lastchild = self.wrapper.children(':last'); 
							lastchild.swapClass("tvilc", "tvic"); 
							lastchild.swapClass("tvile", "tvie"); 
							lastchild.swapClass("tvil", "tvi");  
							
							}//children - change end of list
						self.wrapper.append(nn.jnode.swapClass('tvi', 'tvil'));
						return nn;
						}

					function toggle(){ 
						var t = self.jnode.hasClass("tvic") || self.jnode.hasClass("tvie") || self.jnode.hasClass("tvilc") || self.jnode.hasClass("tvile");
						if(!t) return;
						self.jnode.swapClass('tvic', 'tvie'); self.jnode.swapClass('tvilc', 'tvile');
						self.wrapper.slideToggle();
						}
					function toNode(){ self.jnode.swapClass('tvil', 'tvilc');self.jnode.swapClass('tvi', 'tvic');}
					}							
					return this;
			}// end Tree
			return tree;
		},
	/** Uses templating 	
	*/
	owl_propertyLens : function(options){

		this.options = $.extend(true, {
			hideEmptyFields : true,
			onUpdate : function(item){}, 
			split : {'owl:disjointWith' : ', '}, 
			disable : {},
			click : {'owl:disjointWith': true },
			label : {},
			tooltip : {} //jquery element or owl ui component
			}, options);
		/** determine what this component will respond to, default = owl:Class */
		this.options.type = ((this.hasClass('resourcebox')) ? this.attr("data-jowl") : $('.resourcebox', this).attr("data-jowl")) || this.options.type || "owl:Class";

		var self = this;
		var backlink = $('<div class="backlink jowl_link"/>').text("Back").hide();
		this.originalContent = this.wrapInner($("<div/>")).children().remove();
		this.content = this.originalContent; 
		this.empty();
		this.addClass("owl_UI");

		jOWL.UI.asBroadcaster(this);
		/** */
		this.formatHTML = function(element, results, source){
			if(results.length === 0) return false;
			var type = element.attr('data-jowl');
			var splitter = self.options.split[type] || ', ';
			
			if(element.get(0).nodeName == "INPUT"){
					if(element.attr("type") != "text") return false;
					if(typeof splitter != "string") splitter = ", ";				
					element.val($.map(results, function(n){ return n.label; }).join(splitter));
				}
			else if(element.get(0).nodeName == "TEXTAREA"){
					if(typeof splitter != "string") splitter = ", ";
					element.val($.map(results, function(n){ return n.label; }).join(splitter));
				}
			else for(var i=0;i<results.length;i++){
					var el = false;
					if(results.length == 1){ el = element; element.html(results[i].label); }
					else if(typeof splitter == 'string')
					{						
						el = $("<span/>").html(results[i].label).appendTo(element);
						if(i<results.length-1) element.append($("<span/>").text(splitter));
					}
					//assume splitter is jquery object
					else { el = splitter.clone('true').html(results[i].label).appendTo(element); }

					self.link(el, results[i], source, type);
				}
				return true;
		}
		/** create tooltip or fire change with potential backlink	*/
		this.link = function(element, target, source, type){
			if(!target.URI) return false;
			if(!self.options.click[type] && !self.options.tooltip[type]) return  false;
			var n = jOWL(target.URI); if(!n) return  false;
			//check if tooltip matches type of object
			if(self.options.tooltip[n.type]){
				element.addClass("jowl_tooltip").tooltip({ title: entry.label, body: self.options.tooltip[n.type], object: n, html: tooltipHTML });					
			}
			else if(self.options.click[type]){
				if(self.options.type && self.options.type != n.type) return;
				element.addClass("jowl_link").click(function(){						
				self.broadcast(n); self.propertyChange(n); 
				backlink.show();
				backlink.source = source.name;
				backlink.unbind('click').click(function(){ self.broadcast(source); self.propertyChange(source); backlink.hide(); }); });	
			}
			else if(self.options.tooltip[type]) {
				element.addClass("jowl_tooltip").tooltip({title: entry.label, body: self.options.tooltip[type], object: n, html: tooltipHTML });					
			}
			function tooltipHTML(){
				if(this.body.propertyChange) this.body.propertyChange(this.object);
				return this.body.get(0);					
			}		
		}

		function valuebox(propertybox){
			this.type = this.attr("data-jowl"); if(!this.type) throw "no data-jowl specified";
			this.format = function(jOWLelement){
				var fn = self.fn[this.type] || self.fn["default"]; 
				var results = fn.call(this, jOWLelement);
				if(results && self.formatHTML(this, results, jOWLelement)) propertybox.show(); 
			}
			return this;		
		}
		
		function propertybox(){
			this.valuebox = valuebox.call($('.valuebox', this), this);
			if(!this.valuebox.length == 1) throw "invalid valuebox specification";
			this.format = function(jOWLelement){
				if(self.options.disable[this.valuebox.type]) this.valuebox.empty();
				else { this.valuebox.format(jOWLelement);	}
			}
			return this;		
		}

		

		this.fn = {
			/** 
			should return objects (or array of objects) of the form : {label : "something", URI : "something" },
			each fn specified here can be overwritten (cfr editablelens), or new ones can be created
			'this' keyword refers to the valuebox element, has variable 'type'
			*/
			"rdfs:comment" : function(jOWLelement){
				return $.map(jOWLelement.description(), function(n, i){return {label: n}; });
			},
			"owl:disjointWith" : function(jOWLelement){
				if(self.options.type != "owl:Class") return false;
				var type = this.type;
				return $.map(
							jOWL.XPath('*', jOWLelement.jnode).filter(function(){return this.nodeName == type}), 
							function(n, i){
								var URI = $(n).RDF_Resource();
								var label = self.options.label[type] ? jOWL(URI).label() : jOWL.getURIArray(URI)[1].beautify();
								return {label: label, URI: URI};
							});			
			},
			"rdf:ID" : function(jOWLelement){ return [{label: jOWLelement.name, URI: jOWLelement.URI}]; },
			"rdfs:label" : function(jOWLelement){ return [{label: jOWLelement.label(), URI: jOWLelement.URI}]; },
			"owl:Thing" : function(jOWLelement){ 
				if(self.options.type != "owl:Class") return false;
				var map = [];
				new jOWL.SPARQL_DL("Type(?x, concept)", {"concept": jOWLelement})
					.execute({childDepth : 1, async: false, onComplete : function(r){
						map = $.map(r.results, function(n, i){return { label : n["?x"].label(), URI : n["?x"].name }; });
				}}); 
				return map;
				},
			"owl:Restriction" : function(jOWLelement){
				var content = this.html(); this.empty();
				if(self.options.type == "owl:Class"){							
						var sourceof = jOWLelement.valueRestrictions(true);
						var restrs = [], temp = {}, props = [];
						/** create an index with key == property */
						sourceof.each(function(i){
							if(!temp[i.property.name]) {
								props.push(i.property);
								temp[i.property.name] = [{label: i.target, URI: i.target}];
							}
							else temp[i.property.name].push({label: i.target, URI: i.target});
						});
						/** if multiple targets for a property, remove all 'rdfs:range' targets */
						for(var y = 0;y<props.length;y++){
							var arr = temp[props[y].name], arr2 = [];
							if(arr.length <= 1) break;
							for(var z = 0;z<arr.length;z++){ 
								if(arr[z].label != props[y].range) arr2.push(arr[z]);
							}
							temp[props[y].name] = arr2;
						}
						for(x in temp){
							var ct = $('<div/>').html(content);
							self.formatHTML($("[data-jowl=target]", ct), temp[x], jOWLelement);
							self.formatHTML($("[data-jowl=owl:onProperty]", ct), [{label: x, URI: x}], jOWLelement);
							restrs.push({ label:ct.children() });
						}
						return restrs;
					} //end owl:Class
				else if(self.options.type == "owl:Thing"){
						var tmp = [];
						var sourceof = jOWLelement.valueRestrictions(true).JSON();
						for(x in sourceof){
							var ct = $('<div/>').html(content);
							var syntax = "";
							if(x == 'img'){ ct.html('<img src="'+sourceof[x]+'"/>'); }
							else {
								var temp = [];
								if(typeof sourceof[x] == "string"){
									temp.push({label: sourceof[x].beautify(), URI: sourceof[x]});
									}
								else {
									for(var i = 0;i<sourceof[x].length;i++){
									temp.push({label: sourceof[x][i].beautify(), URI: sourceof[x][i] });
									}
								}
								self.formatHTML($("[data-jowl=target]", ct), temp, jOWLelement);
								self.formatHTML($("[data-jowl=owl:onProperty]", ct), [{label: x, URI: x}], jOWLelement);
							}
							tmp.push({label: ct.children()  });
						}
						return tmp;					
					}
					return false;
				},
			"terms" : function(jOWLelement){
				return $.map(jOWLelement.terms(), function(n, i){return {label: n[i][0], URI: n[i][1]};})
				},
			"permalink" : function(jOWLelement){
				var href = jOWL.permalink(jOWLelement);
				var content = (this.get(0).nodeName == "A") ? this.attr('href', href).text() : $('<a/>').attr('href', href).text("Permalink");
				return [{label: content }];
				},
			//for example for custom annotation properties
			"default" : function(jOWLelement){
				var type = this.type;
				return $.map(
							jOWL.XPath('*', jOWLelement.jnode).filter(function(){return this.nodeName == type}),
							function(n, i){ var txt = $(n).text(); return {label: txt, URI: txt}; }
							);	
			}
			
		}

		this.propertyChange = function(item){			
			if(item.type != self.options.type) return;
			if(backlink.source != item.name) { backlink.hide(); } else backlink.source = false; 
			this.empty().append(self.content.clone(true)).append(backlink);
			var boxes = $('.propertybox', this); 
			if(self.options.hideEmptyFields) { boxes.hide(); }
			boxes.each(function(){	propertybox.call($(this)).format(item); });
			self.options.onUpdate(item);		
			}//end propertyChange
		return this;
		}

		});
/** 
Supporting functionality
*/

$.fn.swapClass = function(c1,c2) {
    return this.each(function() {if ($(this).hasClass(c1)) { $(this).removeClass(c1); $(this).addClass(c2);} else if ($(this).hasClass(c2)) {$(this).removeClass(c2);$(this).addClass(c1);}});
};
/**Modified tree creation
var tree = $(selector).createTree();
tree.add("node");
tree.add("node2").add("child");
*/
$.fn.createTree = function(text, options){
    options = $.extend({collapse:false}, options);

    function node(text, isRoot){ //creates a new node
        this.jnode; if(isRoot) this.jnode= $('<li class="root"/>'); else this.jnode= $('<li class="tvi"/>');
        this.name = null; if(text) this.name = $('<span class="name"/>').html(text).appendTo(this.jnode);
        this.wrapper = $('<ul/>').appendTo(this.jnode);
        var that = this;

        this.add = function(text){
            var nn = new node(text);
            if(this.wrapper.children().length == 0) { this.toNode(); 
			if(that.name) that.name.click(function(){that.toggle();}); 
			if(options.collapse && !isRoot) that.toggle();    }//no children
            else { var lastchild = that.wrapper.children(':last'); lastchild.swapClass("tvilc", "tvic"); lastchild.swapClass("tvile", "tvie"); lastchild.swapClass("tvil", "tvi");    }//children - change end of list
            this.wrapper.append(nn.jnode.swapClass('tvi', 'tvil'));
            return nn;
            }

        this.toggle = function(){ that.jnode.swapClass('tvic', 'tvie'); that.jnode.swapClass('tvilc', 'tvile'); 
		
		that.wrapper.slideToggle();}
        this.toNode = function(){ that.jnode.swapClass('tvil', 'tvilc');that.jnode.swapClass('tvi', 'tvic');}
        }
    //dynamic tree
    if(this.get(0).localName != 'UL'){ 
		if(!text) text = ''; var root = new node(text, true);
		root.wrapper.addClass("tv");
		root.jnode.appendTo($('<ul/>').addClass("owl_treeview").appendTo(this)); return root;}
    //static convert into tree, atm not changeable, and requires span wrappings around nodeitems
    else {
        this.addClass('tv'); this.find("li:last-child").addClass("tvil").end().find("li:has(ul)").addClass("tvic").swapClass("tvil", "tvilc");
        this.find('li>span').addClass('name').click(function(){ $(this).parent("li").swapClass("tvic", "tvie").swapClass("tvilc", "tvile").find(">ul").slideToggle("normal"); });}
};

})(jQuery);