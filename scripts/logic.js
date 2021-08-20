const cloneDeep = require('lodash.clonedeep')
const defaultBlocks = {
  AND: (inputs) => {
    for (let input of inputs) {
      if (input[0] === 0) {
        return 0;
      }
    }
    return 1;
  },
  OR: (inputs) => {
    for (let input of inputs) {
      if (input[0] === 1) {
        return 1;
      }
    }
    return 0;
  },
  NOT: (input) => {
    if (input[0][0] === 1) {
      return 0;
    }
    return 1;
  },
  CONST1: () => 1,
  CONST0: () => 0,
};

class Circuit {
  constructor(components, circuitOutput) {
    this.inputs = [];
    this.components = components;
    this.result = circuitOutput;
  }
  evaluate() {
    for (let component of this.components) {
      if (component instanceof Circuit) {
        component.evaluate();
      } else {
        component.propagate();
      }
    }
    this.result.propagate();
    return this.result.state[0];
  }
}

class Component {
  constructor(type) {
    this.type = type;
    this.inputs = [];
    this.state = [];
    this.port = undefined; // this will be the port number if this component is an input
}
  propagate() {
    // DECIDES WHETHER INPUT BECOMES REPEATER OR NOT
    if ((this.type.substring(0,5) === "CONST" && this.inputs.length === 0) || this.type.substring(0,5) !== "CONST") {
      this.state[0] = defaultBlocks[this.type](this.inputs)
    } else {
      this.state[0] = this.inputs[0][0]
    }
  }
}
const connectedTo = []
let count = 0;

const CONST1 = new Component("CONST1");
const CONST2 = new Component("CONST1");

const CONST0 = new Component("CONST0");

const AND1 = new Component("AND");
AND1.inputs.push(CONST1.state);
AND1.inputs.push(CONST2.state);
connectedTo.push([CONST1, AND1])
connectedTo.push([CONST2, AND1])

const NOT1 = new Component("NOT")
NOT1.inputs.push(AND1.state)
connectedTo.push([AND1, NOT1])

const circuit = new Circuit([CONST1, CONST2, AND1], NOT1);
circuit.inputs.push(CONST1);
circuit.inputs.push(CONST2);

// console.log(circuit.evaluate())

const circuit2 = cloneDeep(circuit) // NAND of (1 NAND 0) = 1
// circuit2.components[0].type = "CONST0" // changing input value

// // console.log(circuit2.evaluate())

// const circuit3 = cloneDeep(circuit) // NAND of (1 NAND 0) = 1
// circuit3.components[0].type = "CONST0"

// // console.log(circuit3.evaluate())

// const AND3 = new Component("AND") 
// AND3.inputs.push(circuit2.result.state)
// AND3.inputs.push(circuit3.result.state)

// const circuit4 = new Circuit([circuit2, circuit3], AND3) // (NAND AND NAND) of (1 AND 1) = 1 

// const circuit5 = cloneDeep(circuit4)
// circuit5.components[0].components[0].type = "CONST1" // 

// console.log(circuit4.evaluate())
// console.log(circuit5.evaluate())

console.log(circuit2.inputs[0] === circuit2.components[0])