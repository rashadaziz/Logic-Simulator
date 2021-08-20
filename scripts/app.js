import interact from "https://cdn.interactjs.io/v1.10.11/interactjs/index.js";
import LeaderLine from "https://cdn.jsdelivr.net/gh/rashadaziz/Logic-Simulator/leader-line.min.js";
import cloneDeep from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/cloneDeep.js";
const components = {
  //id: {wires: [], object: instanceof Component/Circuit, portCount: {inputs: Number, outputs: Number}}
};
const savedCircuits = {
  // id: instanceof Circuit
};

const masterButtons = document.querySelectorAll(".master");
const circuit = document.querySelector(".circuit-board");
const masterControl = document.querySelector(".master-control-bar");
const input = document.querySelector(".INPUTPINADD");
const output = document.querySelector(".OUTPUTPINADD");
const clear = document.querySelector(".CLEAR");
const PORTINPUT = document.querySelector(".PORT-INPUTS");
const PORTOUTPUT = document.querySelector(".PORT-OUTPUTS");
const simulate = document.querySelector(".simulate");
const save = document.querySelector(".save");
const modal = document.querySelector(".modal");
const modalContent = document.querySelector(".modal-content");
const overlay = document.querySelector("#overlay");
const closeModal = document.querySelector(".close-button");
const deleteButton = document.querySelector(".DELETE");
const circuitOutputId = [];

let IOWires = [];
let allWires = [];
let interval = null;
let ioCountIn = 0;
let ioCountOut = 0;
let componentCount = 0;
let currentSelectedComponent = null;
let selectedOutput = null;
let selectedInput = null;
let simulating = false;
let simulatedCircuit = null;
let changes = false;
let changeListener = null;
/**********
BUTTON LISTENERS
 ***********/
input.addEventListener("click", addCircuitIO);
output.addEventListener("click", addCircuitIO);
clear.addEventListener("click", clearBoard);
save.addEventListener("click", saveCircuit);
simulate.addEventListener("click", () => {
  if (!simulating) {
    const c = circuitMaker();
    // construct the circuit to be evaluated/simulated
    simulatedCircuit = new Circuit(c[0], c[1], c[2]);
    changes = false; // don't update the circuit

    // evaluate the circuit every 5ms
    interval = setInterval(() => {
      circuitPropagate(simulatedCircuit);
    }, 5);
    // create a listener to update circuit if user add/delete/edit components
    changeListener = setInterval(propagateChanges, 200);

    simulate.style.backgroundColor = "red";
    simulate.innerHTML = "<span>STOP</span>";
    // announce that circuit is simulating
    simulating = true;
  } else {
    // stop simulating and updating
    clearInterval(interval);
    clearInterval(changeListener);
    simulating = false;
    interval = null;
    changeListener = null;
    simulate.style.backgroundColor = "";
    simulate.innerHTML = "<span>Simulate</span>";
  }
});
/********** 
CIRCUIT BOARD LOGIC
***********/
function clearBoard() {
  // this will clear the components object
  for (const prop of Object.getOwnPropertyNames(components)) {
    delete components[prop];
  }
  circuit.innerHTML = "";
  PORTINPUT.innerHTML = "";
  PORTOUTPUT.innerHTML = "";
  // remove all leader lines (wires)
  for (let wire of allWires) {
    wire.remove();
  }
  // reset core references
  allWires = [];
  IOWires = [];
  ioCountIn = 0;
  ioCountOut = 0;
}
// this will deselect the pins if the circuit is focused
circuit.addEventListener("focus", (e) => {
  if (selectedInput) {
    selectedInput.classList.remove("pin-select-input");
    selectedInput = null;
  }
  if (selectedOutput) {
    selectedOutput.classList.remove("pin-select-output");
    selectedOutput = null;
  }
});

/***********
CIRCUIT LOGIC
************/
function circuitPropagate(myCircuit) {
  // .evaluate() will propagate through all components and return result[] containing all circuit outputs
  const result = myCircuit.evaluate();
  // this will evaluate all wires and colorize based on state
  for (let wire of allWires) {
    let origin = wire.start;
    let parentComponent = undefined;
    // get the correct parent component (IO pins are direct childs of their parents)
    if (origin.parentNode.classList.contains("INPUT")) {
      parentComponent = origin.parentNode;
    } else {
      parentComponent = origin.parentNode.parentNode;
    }
    let object = undefined;
    // determines where to retrieve the state of each wire (either from a Circuit/Component)
    if (components[parentComponent.id].object instanceof Circuit) {
      let portNumber = parseInt(wire.start.id.charAt(wire.start.id.length - 1));
      object = components[parentComponent.id].object.result[portNumber];
    } else {
      object = components[parentComponent.id].object;
    }
    // colorize (high/low // 1/0)
    if (object.state[0] === 1) {
      wire.color = "red";
    } else if (object.state[0] === 0) {
      wire.color = "grey";
    } else if (object.state[0] === "X") {
      wire.color = "blue";
    }
  }
  // get all output components (if present) and colorize based on state
  const output = document.querySelectorAll(".OUTPUT");
  if (output.length > 0) {
    for (let pin of output) {
      // outputs of circuit are index-based
      let portNumber = parseInt(pin.id.charAt(pin.id.length - 1));
      // get the correct output state from result[]
      let port = result[portNumber];
      if (port) {
        if (port.state[0] === 1) {
          pin.classList.add("toggled");
        } else if (port.state[0] === 0) {
          pin.classList.remove("toggled");
        }
      }
    }
  }
  // this evaluates all digit counters (if present) and displays the number
  const counters = document.querySelectorAll(".number-display");
  if (counters.length > 0) {
    for (let counter of counters) {
      const object = components[counter.id].object;
      if (object.state[0] || object.state[0] === 0) {
        counter.childNodes[0].innerHTML = `<h1>${object.state[0]}</h1>`;
      }
    }
  }
}
function propagateChanges() {
  // this will update circuit if changes === true
  if (changes) {
    const c = circuitMaker();
    simulatedCircuit = new Circuit(c[0], c[1], c[2]);
    changes = false;
    // it will propagate once to update the states of each component/circuit
    circuitPropagate(simulatedCircuit);
  }
}
// NOT FINISHED
function saveCircuit(e) {
  // TODO: add modal for save menu
  const input = document.querySelector(".circuit-name");
  if (!input.classList.contains("show")) {
    input.classList.add("show");
  } else {
    input.classList.remove("show");
    const c = circuitMaker();
    // resetStates(c);
    const circuitToSave = new Circuit(c[0], c[1], c[2]);
    savedCircuits[`${input.value}`] = circuitToSave;

    let button = document.createElement("button");
    button.classList.add("custom-btn");
    button.classList.add("btn-3");
    button.id = input.value;
    button.innerHTML = `<span>${input.value.toUpperCase()} Gate</span>`;
    button.addEventListener("click", addSavedCircuit);
    masterControl.appendChild(button);
    clearBoard();
  }
}
function addSavedCircuit(e) {
  e.stopPropagation();

  const name = e.currentTarget.id;
  const savedCircuit = savedCircuits[name];
  // Deep clones the circuit so no references are conflicting
  const circuitToAdd = cloneDeep(savedCircuit);

  let label = document.createElement("p");
  let component = document.createElement("div");
  let inputs = document.createElement("section");
  let outputs = document.createElement("section");

  component.classList.add("component");
  component.style.backgroundColor = circuitToAdd.color;
  inputs.classList.add("inputs");
  outputs.classList.add("outputs");

  label.innerHTML = `<h1>${name}</h1>`;
  component.id = `component-${componentCount++}`;
  component.tabIndex = "-1";

  component.appendChild(label);
  component.appendChild(inputs);
  component.appendChild(outputs);
  circuit.appendChild(component);

  components[`${component.id}`] = {};
  const $ = components[`${component.id}`];

  $.object = circuitToAdd;
  $.wires = [];
  $.portCount = {};

  $.portCount.inputs = 0;
  $.portCount.outputs = 0;

  // adds appropriate amount of i/o pins for the circuit
  for (let inputs of circuitToAdd.inputs) {
    addPins("inputs", component);
  }
  for (let outputs of circuitToAdd.result) {
    addPins("output", component);
  }
  component.addEventListener("dblclick", modalOpen);
  changes = true; // update the circuit
}
function circuitMaker() {
  // the circuit is divided into 3 parts (inputs->components->outputs)
  const allComponents = [];
  const allInputs = [];
  const allOutputs = [];

  // loops through all the components in the components object and appends to the appropriate array
  for (let component in components) {
    const $ = components[component].object;

    allComponents.push($);
    if ($.isOutput) {
      allOutputs.push($);
    } else if ($.isInput) {
      allInputs.push($);
    }
  }
  // since circuitMaker() is also used in propagateChanges() we only want to resetStates() when we're saving a circuit
  if (!changes) {
    resetStates([allComponents, allOutputs, allInputs]);
  }
  return [allComponents, allOutputs, allInputs];
}
function resetStates(c) {
  // loops through all the components and set state of each to 0
  for (let component of c[0]) {
    if (component instanceof Circuit) {
      for (let output of component.result) {
        output.state[0] = 0;
      }
    } else {
      component.state[0] = 0;
    }
  }
  for (let output of c[1]) {
    output.state[0] = 0;
  }
}
/**********
MODAL LOGIC
 **********/
function modalOpen(e) {
  if (selectedInput) {
    selectedInput.classList.remove("pin-select-input");
  }
  if (selectedOutput) {
    selectedOutput.classList.remove("pin-select-output");
  }
  if (e.currentTarget) {
    currentSelectedComponent = e.currentTarget;
  } else {
    currentSelectedComponent = e;
  }

  modal.classList.add("active");
  overlay.classList.add("active");

  deleteButton.addEventListener("click", deleteEvent);
  if (currentSelectedComponent.classList.contains("number-display")) {
    initCounterControls();
  }
}
function deleteEvent(e) {
  e.stopPropagation();
  deleteComponent();
  modal.classList.remove("active");
  overlay.classList.remove("active");
  deleteButton.removeEventListener("click", deleteEvent);
  modalContent.innerHTML = "";
}

closeModal.addEventListener("click", close);

function close(e) {
  const modal = e.currentTarget.parentNode.parentNode;
  modal.classList.remove("active");
  overlay.classList.remove("active");
  currentSelectedComponent = null;
  modalContent.innerHTML = "";
}
/********** 
COMPONENT LOGIC
***********/
for (let button of masterButtons) {
  button.addEventListener("click", () => {
    let label = document.createElement("p");
    let component = document.createElement("div");
    let inputs = document.createElement("section");
    let outputs = document.createElement("section");

    if (button.classList[0] === "COUNTER") {
      component.classList.add("number-display");
    } else {
      component.classList.add("component");
    }

    inputs.classList.add("inputs");
    outputs.classList.add("outputs");
    label.innerHTML = `<h1>${button.classList[0]}</h1>`;
    component.id = `component-${componentCount++}`;
    component.tabIndex = "-1";

    if (button.classList[0] === "COUNTER") {
      label.innerHTML = `<h1>0</h1>`;
      label.classList.add("digit-display");
    }
    component.appendChild(label);
    component.appendChild(inputs);
    if (button.classList[0] !== "COUNTER") {
      component.appendChild(outputs);
    }
    circuit.appendChild(component);

    component.addEventListener("dblclick", modalOpen);

    components[`${component.id}`] = {};
    const $ = components[`${component.id}`];
    let logicObject = null;
    // this will construct the appropriate object
    if (button.classList[0] === "COUNTER") {
      logicObject = new Counter();
    } else {
      logicObject = new Component(`${button.classList[0]}`);
    }
    component.style.backgroundColor = logicObject.color;

    // set helper attrbutes
    $.wires = [];
    $.object = logicObject;

    $.portCount = {};
    $.portCount.inputs = 0;
    $.portCount.outputs = 0;

    if (button.classList[0] === "NOT") {
      addPins("inputs", component);
      addPins("outputs", component);
    } else if (button.classList[0] === "COUNTER") {
      for (let i = 0; i < $.object.bits; i++) {
        addPins("inputs", component);
      }
    } else {
      addPins("inputs", component);
      addPins("inputs", component);
      addPins("outputs", component);
    }
    changes = true; // update the circuit (new component was added)
  });
}
function addCircuitIO(e) {
  let selectedPort = null;
  let pinType = null;
  // pinType determines which port the component will get appended to
  if (e.currentTarget.classList.contains("INPUTPINADD")) {
    selectedPort = document.querySelector(".PORT-INPUTS");
    pinType = "INPUT";
  } else {
    selectedPort = document.querySelector(".PORT-OUTPUTS");
    pinType = "OUTPUT";
  }
  const pin = document.createElement("div");
  const port = document.createElement("div");
  pin.classList.add("PORT-PINS");
  port.classList.add(pinType);
  port.appendChild(pin);
  port.id = pinType === "INPUT" ? `IN-${ioCountIn++}` : `OUT-${ioCountOut++}`;
  selectedPort.appendChild(port);

  components[`${port.id}`] = {};
  const $ = components[`${port.id}`];
  let logicObject = undefined;
  // constructs appropriate object
  if (pinType === "OUTPUT") {
    logicObject = new Component("CONST0", true, false);
  } else if (pinType === "INPUT") {
    logicObject = new Component("CONST0", false, true);
    logicObject.port = ioCountIn - 1;
  }
  // set helper attributes
  $.wires = [];
  $.object = logicObject;

  $.portCount = {};
  $.portCount.inputs = 0;
  $.portCount.outputs = 0;

  let componentType = pinType === "OUTPUT" ? "inputs" : "outputs";
  let portNumber = $.portCount[componentType];

  pin.id = portNumber;
  // i forgot what i used this for
  if (pinType === "OUTPUT") {
    circuitOutputId.push(port.id);
  }
  // adds event listeners for toggling, connecting and deleting
  pin.addEventListener("click", selectPin);
  pin.addEventListener("contextmenu", deleteWire);
  if (pinType === "INPUT") {
    port.addEventListener("click", toggleInput);
  }
  // update positions of leader lines (wires)
  for (let wire of IOWires) {
    wire.position();
  }
  port.addEventListener("contextmenu", (e) => {
    deleteCircuitIO(e, port);
  });
  changes = true; // update the circuit (i/o was added)
}
function toggleInput(e) {
  e.stopPropagation();
  const port = e.currentTarget;
  // cannot toggle when we're not simulating
  if (simulating) {
    // moving class will eliminate toggling while dragging i/o component
    if (!port.classList.contains("moving")) {
      // colorize and update object state
      if (!port.classList.contains("toggled")) {
        port.classList.add("toggled");
        components[port.id].object.type = "CONST1";
      } else {
        port.classList.remove("toggled");
        components[port.id].object.type = "CONST0";
      }
    }
  }
}
function deleteCircuitIO(e, component) {
  e.preventDefault();
  e.stopPropagation();
  // delete i/o component
  currentSelectedComponent = component;
  removePart();
  delete components[currentSelectedComponent.id];
  if (component.parentNode.classList.contains("PORT-INPUTS")) {
    PORTINPUT.removeChild(component);
  } else {
    PORTOUTPUT.removeChild(component);
  }
  // update leader line positions (wires)
  for (let wire of allWires) {
    wire.position();
  }
  changes = true; // update the circuit (i/o was deleted)
  currentSelectedComponent = null;
}
// this function is for the counter component only
function initCounterControls() {
  let container = document.createElement("div");
  container.classList.add("container");
  container.innerHTML = `<label class="modal-label" for="">Input Bits:</label>
  <select class="bit-select" name="" id="">
      <option value="1">1 Bit</option>
      <option value="2">2 Bits</option>
      <option value="3">3 Bits</option>
      <option value="4">4 Bits</option>
      <option value="5">5 Bits</option>
      <option value="6">6 Bits</option>
      <option value="7">7 Bits</option>
      <option value="8">8 Bits</option>
  </select>
  <div class="container">
      <label class="modal-label" for="">Representation:</label>
      <p class="onoff"><input class="signed" type="checkbox" value="1" id="checkboxID"><label for="checkboxID"></label></p>
  </div>
  `;
  const counter = components[currentSelectedComponent.id];

  modalContent.prepend(container);
  const bitSelect = document.querySelector(".bit-select");
  const signed = document.querySelector(".signed");
  // will set the representation checkbox state
  bitSelect.children[counter.object.bits - 1].selected = true;
  if (counter.object.signed) {
    signed.checked = true;
  }
  // event listeners listening for change in component settings
  signed.addEventListener("change", (e) => {
    if (e.currentTarget.checked) {
      counter.object.signed = true;
    } else {
      counter.object.signed = false;
    }
  });
  bitSelect.addEventListener("change", (e) => {
    addBits(e, counter);
  });
}
function deleteComponent() {
  // remove component from circuit board
  removePart();
  circuit.removeChild(currentSelectedComponent);
  // update positions of wires
  for (let wire of allWires) {
    wire.position();
  }
  delete components[currentSelectedComponent.id];
  changes = true; // update the circuit (component was deleted)
  currentSelectedComponent = null;
}
function removePart() {
  // retrieve corresponding component from components object
  const component = components[currentSelectedComponent.id];
  // this will loop through all the wires and disconnect/remove them
  for (let wires of component.wires) {
    const from = wires.start;
    const to = wires.end;
    // update pin classList
    checkConnections(from);
    to.classList.remove("connected");
    // will get the corresponding parent components of wire.start and wire.end
    const edgeEnd = to.classList.contains("PORT-PINS")
      ? to.parentNode.id
      : to.parentNode.parentNode.id;
    const edgeStart = from.classList.contains("PORT-PINS")
      ? from.parentNode.id
      : from.parentNode.parentNode.id;
    // get all wires of starting and ending component
    const wiresOfStart = components[edgeStart].wires;
    const wiresOfEnd = components[edgeEnd].wires;

    const startObject = components[edgeStart].object;
    const endObject = components[edgeEnd].object;
    // if the wire starts from the current selected component, it will update the ending component
    if (edgeStart === currentSelectedComponent.id) {
      filterMutate(wires, wiresOfEnd);
      if (endObject instanceof Circuit) {
        endObject.inputs[wires.end.id].inputs[0] = undefined;
      } else {
        endObject.inputs[wires.end.id] = undefined;
      }
      // else it will update the starting component
    } else {
      filterMutate(wires, wiresOfStart);
    }
    // remove the wire from the DOM
    wires.remove();
    // filter the wire from the following arrays
    filterMutate(wires, IOWires);
    filterMutate(wires, allWires);
  }
  changes = true; // update the circuit (component was deleted)
}
/********** 
PIN LOGIC
***********/
function addPins(e, component = currentSelectedComponent) {
  let selectedPort = null;
  try {
    // this will decide whether caller was an event listener or normal function call
    if (e.currentTarget.classList.contains("PININ")) {
      selectedPort = "inputs";
    } else {
      selectedPort = "outputs";
    }
  } catch {
    if (e === "inputs") {
      selectedPort = "inputs";
    } else {
      selectedPort = "outputs";
    }
  }

  let $ = components[component.id];
  let portNumber = $.portCount[selectedPort]++;
  const maxPins = Math.max($.portCount["inputs"], $.portCount["outputs"]);
  // append the pin to the component
  const port = document.querySelector(`#${component.id} .${selectedPort}`);
  const pin = document.createElement("div");
  pin.classList.add("pins");
  pin.id = portNumber;
  port.appendChild(pin);
  pin.addEventListener("click", selectPin);
  pin.addEventListener("contextmenu", deleteWire);
  // height limiter for counter components
  if (component.classList.contains("number-display")) {
    component.style.minHeight = "4.6%";
  }
  // this will adjust the height of the component
  const PHI = 1.61803398875;
  const bias = PHI / maxPins;
  component.style.height = `${Math.pow(maxPins, 1.2 + bias)}%`;
  // update the positions of the wires connected ONLY to the component
  moveWire($);
}
function selectPin(e) {
  e.stopPropagation();
  // logic for when uses clicks on an input and output pin to connect a wire
  const selectedPin = e.currentTarget;
  const selectedPort = selectedPin.parentNode;
  if (selectedInput) {
    selectedInput.classList.remove("pin-select-input");
  }
  if (selectedOutput) {
    selectedOutput.classList.remove("pin-select-output");
  }
  if (
    selectedPort.classList.contains("inputs") ||
    selectedPort.classList.contains("OUTPUT")
  ) {
    selectedPin.classList.add("pin-select-input");
    selectedInput = selectedPin;
  } else {
    selectedPin.classList.add("pin-select-output");
    selectedOutput = selectedPin;
  }
  // handles if the wire is from/to i/o components or component->component
  if (selectedInput && selectedOutput) {
    if (selectedInput.classList.contains("PORT-PINS") && selectedOutput) {
      connect(selectedInput.parentNode.id);
    } else if (
      selectedInput &&
      selectedOutput.classList.contains("PORT-PINS")
    ) {
      connect(
        selectedInput.parentNode.parentNode.id,
        selectedOutput.parentNode.id
      );
    } else {
      connect();
    }
  }
}
// add input bits for counter component
function addBits(e, counter) {
  const bits = parseInt(e.currentTarget.value);
  let bitsToAdd = bits - counter.object.bits;
  if (bitsToAdd > 0) {
    // if user is adding input bits
    for (let i = 0; i < bitsToAdd; i++) {
      addPins("inputs", currentSelectedComponent);
      // push undefined input (hanging input)
      counter.object.inputs.push(undefined);
    }
    e.currentTarget.children[counter.object.bits - 1].selected = false;
    counter.object.bits = e.currentTarget.value;
    e.currentTarget.children[counter.object.bits - 1].selected = true;
  } else {
    // if bitsToAdd < 0 then user wants to remove input bits
    removeInputPins(bits);
  }
}
function removeInputPins(bits) {
  // get all the input pins
  const inputs = currentSelectedComponent.children[1];
  // artificially create a contextmenu event to simulate right click (removing wires)
  let evt = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  let pinsToRemove = [];
  // this will remove the pins starting from the LSB
  for (let i = inputs.childElementCount - 1; i > bits - 1; i--) {
    let pin = inputs.children[i];
    pin.dispatchEvent(evt);
    pinsToRemove.push(pin);
  }
  // remove the pin from the inputs (DOM)
  for (let pin of pinsToRemove) {
    inputs.removeChild(pin);
  }
  let $ = components[currentSelectedComponent.id];
  $.portCount["inputs"] = inputs.childElementCount;
  $.object.bits = inputs.childElementCount;
  // modify the object inputs and splice based on the removed inputs
  $.object.inputs.splice(bits);
  // adjust height of the component
  const maxPins = Math.max($.portCount["inputs"], $.portCount["outputs"]);
  let bias = 2 / maxPins;
  currentSelectedComponent.style.height = `${Math.pow(maxPins, 1.2 + bias)}%`;
  // update wire positions connected ONLY to the component
  moveWire($);
}
// function to check the number of connections OUTGOING from an OUTPUT pin
function checkConnections(from) {
  let count = from.classList[2];
  let integerised = parseInt(count);
  from.classList.remove(`${count}`);
  from.classList.add(`${--integerised}`);
  // if the number of connections === 0, then remove "connected" class
  if (!integerised) {
    from.classList.remove("connected");
    from.classList.remove(`${integerised}`);
  }
}
/*********
WIRE LOGIC
**********/
function connect(
  parentInputComponent = selectedInput.parentNode.parentNode.id,
  parentOutputComponent = selectedOutput.parentNode.parentNode.id
) {
  const inputParentComponent = parentInputComponent;
  const outputParentComponent = parentOutputComponent;
  // check position of input relative to the output (if < 0 then input is behind output, vice versa)
  const inputX = selectedInput.getBoundingClientRect();
  const outputX = selectedOutput.getBoundingClientRect();
  const relativePos = inputX.left - outputX.left;

  const wire = new LeaderLine(selectedOutput, selectedInput, {
    color: "grey",
    endPlug: "disc",
    startSocket: "right",
    endSocket: "left",
    path:
      inputParentComponent === outputParentComponent || relativePos < 0
        ? "grid"
        : "fluid",
    hide: true,
  });
  setTimeout(function () {
    selectedInput = null;
    selectedOutput = null;
  }, 310);
  wire.show("draw", { duration: 300 }); // draw wire
  // an input pin can only have one wire connected to it
  if (selectedInput.classList.contains("connected")) {
    let interval = undefined;
    // wire will flash blue for 800ms if input pin is connected already
    interval = setInterval(() => {
      wire.color = "blue";
      setTimeout(() => {
        try {
          wire.color = "grey";
        } catch {}
      }, 100);
    }, 200);
    setTimeout(() => {
      clearInterval(interval);
      wire.remove();
    }, 800);
  } else {
    // update objects of start and end of wires
    const from = components[outputParentComponent];
    const to = components[inputParentComponent];
    // handles cases when we're connecting a wire from/to a circuit
    if (from.object instanceof Circuit && to.object instanceof Circuit) {
      to.object.inputs[selectedInput.id].inputs[0] =
        from.object.result[selectedOutput.id].state;
    } else if (to.object instanceof Circuit) {
      to.object.inputs[selectedInput.id].inputs[0] = from.object.state;
    } else if (from.object instanceof Circuit) {
      to.object.inputs[selectedInput.id] =
        from.object.result[selectedOutput.id].state;
    } else {
      to.object.inputs[selectedInput.id] = from.object.state;
    }
    // pushes wire to the wire attribute (used for updating wire positions)
    from.wires.push(wire);
    to.wires.push(wire);

    allWires.push(wire);
    if (from.object.isInput || to.object.isOutput) {
      IOWires.push(wire); // (for updating when adding i/o)
    }

    selectedInput.classList.remove("pin-select-input");
    selectedOutput.classList.remove("pin-select-output");
    selectedInput.classList.add("connected");
    selectedOutput.classList.add("connected");

    let wireOutCount = 0;
    // logic for counting number of connections an OUTPUT pin has
    if (!selectedOutput.classList.contains("pin-select-output")) {
      // if output pin already has connections count in the classList
      if (selectedOutput.classList[2]) {
        let count = selectedOutput.classList[2];
        let integerised = parseInt(count);
        selectedOutput.classList.remove(`${count}`);
        selectedOutput.classList.add(`${++integerised}`);
      } else {
        selectedOutput.classList.add(`${++wireOutCount}`);
      }
    }
    changes = true; // update the cicruit (new connection between components was created)
  }
}
function deleteWire(e) {
  e.preventDefault();
  e.stopPropagation();
  // get the pin
  const pin = e.currentTarget;
  currentSelectedComponent = pin.classList.contains("PORT-PINS")
    ? pin.parentNode
    : pin.parentNode.parentNode;
  const attributes = pin.classList;
  let connectedWire = null;
  // find the wire connected to the pin
  for (let wire of components[currentSelectedComponent.id].wires) {
    if (wire.start === pin || wire.end === pin) {
      connectedWire = wire;
    } // did not use break because i favoured the behaviour of the last wire added is to be deleted
  }
  if (attributes.contains("connected")) {
    disconnect(connectedWire);
  }
}
function disconnect(connectedWire) {
  const from = connectedWire.start;
  const to = connectedWire.end;
  // update pin classList
  checkConnections(from);
  to.classList.remove("connected");
  // get the components at wire.start and wire.end
  const edgeEnd = to.classList.contains("PORT-PINS")
    ? to.parentNode.id
    : to.parentNode.parentNode.id;
  const edgeStart = from.classList.contains("PORT-PINS")
    ? from.parentNode.id
    : from.parentNode.parentNode.id;

  const wiresOfStart = components[edgeStart].wires;
  const wiresOfEnd = components[edgeEnd].wires;

  const startObject = components[edgeStart].object;
  const endObject = components[edgeEnd].object;

  // update the inputs of the wire.end object
  if (endObject instanceof Circuit) {
    endObject.inputs[to.id].inputs[0] = undefined;
  } else {
    endObject.inputs[to.id] = undefined;
  }
  changes = true;

  // filter the wire from these arrays
  filterMutate(connectedWire, wiresOfEnd);
  filterMutate(connectedWire, wiresOfStart);

  // remove the wire from the DOM
  connectedWire.remove();
  // filter the wire from these arrays
  filterMutate(connectedWire, IOWires);
  filterMutate(connectedWire, allWires);
}
function moveWire(component) {
  // update the wire positions of the argument component
  const allComponentWires = component.wires;
  if (allComponentWires) {
    for (let wire of allComponentWires) {
      const inputX = wire.end.getBoundingClientRect();
      const outputX = wire.start.getBoundingClientRect();
      const relativePos = inputX.left - outputX.left;
      wire.position();
      // update the wire path based on the relative position of the input and output pin
      if (relativePos > 0) {
        wire.path = "fluid";
      } else {
        wire.path = "grid";
      }
    }
  }
}
/**********
UTILITY FUNCTIONS
 **********/
// function to filter the array but mutates the array rather than returning a new one
function filterMutate(elem, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === elem) {
      arr.splice(i, 1);
      return;
    }
  }
}
interact(".number-display").draggable({
  // enable inertial throwing
  inertia: true,
  // keep the element within the area of it's parent
  modifiers: [
    interact.modifiers.restrictRect({
      restriction: "parent",
      endOnly: true,
    }),
  ],
  // enable autoScroll
  autoScroll: true,

  listeners: {
    // call this function on every dragmove event
    move: dragMoveListener,
  },
});
interact(".component").draggable({
  // enable inertial throwing
  inertia: true,
  // keep the element within the area of it's parent
  modifiers: [
    interact.modifiers.restrictRect({
      restriction: "parent",
      endOnly: true,
    }),
  ],
  // enable autoScroll
  autoScroll: true,

  listeners: {
    // call this function on every dragmove event
    move: dragMoveListener,
  },
});
interact(".INPUT").draggable({
  // enable inertial throwing
  inertia: true,
  // keep the element within the area of it's parent
  modifiers: [
    interact.modifiers.restrictRect({
      restriction: "parent",
      endOnly: true,
    }),
  ],
  // enable autoScroll
  autoScroll: true,
  lockAxis: "y",

  listeners: {
    // call this function on every dragmove event
    move: dragMoveListener,
    end: stopMoving,
  },
});
interact(".OUTPUT").draggable({
  // enable inertial throwing
  inertia: true,
  // keep the element within the area of it's parent
  modifiers: [
    interact.modifiers.restrictRect({
      restriction: "parent",
      endOnly: true,
    }),
  ],
  // enable autoScroll
  autoScroll: true,
  lockAxis: "y",

  listeners: {
    // call this function on every dragmove event
    move: dragMoveListener,
    end: stopMoving,
  },
});
// this will keep track when an i/o component stops moving after a drag event
function stopMoving(event) {
  setTimeout(() => {
    event.currentTarget.classList.remove("moving");
  }, 200);
}
function dragMoveListener(event) {
  const target = event.currentTarget;
  if (target.classList.contains("INPUT")) {
    target.classList.add("moving");
  }
  // keep the dragged position in the data-x/data-y attributes
  const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
  const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

  // translate the element
  target.style.transform = "translate(" + x + "px, " + y + "px)";

  // update the posiion attributes
  target.setAttribute("data-x", x);
  target.setAttribute("data-y", y);

  moveWire(components[target.id]);
}
/**********
BACKEND LOGIC
 ***********/
// this object describes the behaviour of default components
const defaultBlocks = {
  AND: (inputs) => {
    if (inputs.length > 1) {
      for (let input of inputs) {
        if (input[0] === 0 || !input.length) {
          return 0;
        } else if (input[0] === "X") {
          return "X";
        }
      }
      return 1;
    }
    return 0;
  },
  OR: (inputs) => {
    for (let input of inputs) {
      if (input[0] === 1) {
        return 1;
      } else if (input[0] === "X") {
        return "X";
      }
    }
    return 0;
  },
  NOT: (input) => {
    if (input[0][0] === 1) {
      return 0;
    } else if (input[0][0] === "X") {
      return "X";
    }
    return 1;
  },
  CONST1: () => 1,
  CONST0: () => 0,
  COUNTER: (inputs, signed) => {
    const binary = inputs.flat().join("");
    if (signed) {
      if (binary.length > 1) {
        return (
          // 2's complement logic (-binary(MSB) + binary([MSB+1:]))
          parseInt(binary.slice(1), 2) -
          parseInt(binary[0] + "0".repeat(binary.length - 1), 2)
        );
      } else {
        return parseInt(binary) * -1;
      }
    } else {
      return parseInt(binary, 2);
    }
  },
};
// define colors for the default components
const color = {
  AND: `${"#" + ((Math.random() * 0xffffff) << 0).toString(16)}`,
  OR: `${"#" + ((Math.random() * 0xffffff) << 0).toString(16)}`,
  NOT: `${"#" + ((Math.random() * 0xffffff) << 0).toString(16)}`,
  COUNTER: "grey",
};
class Circuit {
  constructor(components, circuitOutput, inputs = []) {
    this.inputs = inputs;
    this.components = components;
    this.result = circuitOutput;
    this.color = "#" + ((Math.random() * 0xffffff) << 0).toString(16);
  }
  evaluate() {
    // will loop through all the components
    for (let component of this.components) {
      // recursively call .evaluate() when component isnstanceof Circuit (evaluate components of the circuit first)
      if (component instanceof Circuit) {
        // simulate gate delay to minimise race condition for memory circuits
        let gateDelay = Math.random() * 5;
        component.evaluate();
        setTimeout(() => {
          component.evaluate();
        }, gateDelay);
      } else {
        // if component is not a Circuit then we can propagate
        let gateDelay = Math.random();
        setTimeout(() => {
          component.propagate();
        }, gateDelay);
      }
    }
    // output is part of this.components[] but this will check the states again to ensure the correct state
    for (let output of this.result) {
      output.propagate();
    }
    return this.result;
  }
}

class Component {
  constructor(type, isOutput = false, isInput = false) {
    this.isInput = isInput;
    this.isOutput = isOutput;
    this.type = type;
    this.inputs =
      type === "AND" || type === "OR" ? [undefined, undefined] : [undefined];
    if (this.type.substring(0, 5) === "CONST") {
      this.inputs = [];
    }
    this.state = [];
    this.color = color[this.type];
  }
  propagate() {
    if (
      // if the component is NOT a REPEATER (circuit input/output)
      (this.type.substring(0, 5) === "CONST" && this.inputs.length === 0) ||
      this.type.substring(0, 5) !== "CONST"
    ) {
      if (this.inputs.includes(undefined)) {
        this.state[0] = 0;
      } else if (this.type === "COUNTER") {
        this.state[0] = defaultBlocks[this.type](this.inputs, this.signed);
      } else {
        this.state[0] = defaultBlocks[this.type](this.inputs);
      }
    } else {
      // if component IS a REPEATER
      if (this.inputs[0] === undefined) {
        this.state[0] = 0;
      } else {
        this.state[0] = this.inputs[0][0];
      }
    }
  }
}
class Counter extends Component {
  constructor() {
    // extends component since counters need extra attributes
    super("COUNTER", true, false);
    this.signed = false;
    this.bits = 1;
  }
}
