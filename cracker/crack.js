function(C, A) { // { target: #s.example.loc }
  // step 0: verify context
  // step 1: get loc function from args
  // step 2: fetch db state(and user upgrades/transactions?) by user/loc name
  // step 3: stop if breached or timed out
  // step 4: detect the current lock and rotations
  // step 5: attempt a solve-step of the current lock
  // step 6: back to step 3
  // step 7: save state to db

  //@QUINE
  // {
  //  "ez": ["open", "unlock", "release"],
  //  "digits": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  //  "primes": [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97],
  //  "colors": ["green", "lime", "yellow", "orange", "red", "purple", "blue", "cyan"],
  //  "keys": ["cmppiq", "6hh8xw", "uphlaw", "vc2c7q", "tvfkyq", "xwz7ja", "sa23uw", "ellux0", "72umy0", "i874y3", "9p65cu", "fr8ibu", "eoq6de", "xfnkqe", "pmvr1q", "y111qa"],
  //  "data": {
  //   "user ++++++ uses the port epoch environment to request gc": "outta_juice",
  //   "user ++++++ provides instruction via script": "teach",
  //   "\"did you know\" is a communication pattern common to user ++++++": "fran_lee",
  //   "service ++++++ provides atmospheric updates via the port epoch environment": "weathernet",
  //   "safety depends on the use of scripts.++++++": "get_level",
  //   "pet, pest, plague and meme are accurate descriptors of the ++++++": "bunnybat",
  //   "user 'on_th3_1ntern3ts' has ++++++ many things": "heard",
  //   "communications issued by user ++++++ demonstrate structural patterns associated with humor": "sans_comedy",
  //   "a ++++++ is a household cleaning device with a rudimentary networked sentience": "robovac",
  //   "users gather in channel CAFE to share ++++++": "poetry"
  //  }
  // }
  //@QUINE

  let Q = JSON.parse(#fs.scripts.quine().split("\/\/@QUINE")[1].replaceAll(/\/\/(.*)/g, "$1"));

  let loadState = name => {
    let state = #db.f({ _id: "crackState/" + name }).first() || {};

    state = {
      lastCrack: state.lastcrack || 0,
      args: state.args || {},
      currLock: state.currLock || null,
      rotationState: state.rotationState || {},
      lockstackStats: state.lockstackStats || {},
    };

    if (Date.now() - state.lastCrack < 15 * 60 * 1000) { // or whatever the max rotation after poke is
      state.currLock = null;
      state.rotationState = {};
    }

    return state;
  };

  let resetState = name => {
    #db.r({ _id: "crackState/" + name });
    #D("cracker state reset");
  }

  let storeState = (name, state) => {
    state.lastCrack = Date.now();
    #db.us({ _id: "crackState/" + name }, state);
  };

  let isBreached = out => {
    let lines = out.split("\n");

    let normalBreached = lines.slice(-1)[0] == "Connection terminated.";
    let binmatBreached = (lines.length == 1 && lines[0].includes("BINMAT"));

    return normalBreached || binmatBreached;
  };

  let attemptLock = (out, state, name) => {
    let solver = locks[name];
    state.rotationState[name] = state.rotationState[name] || {};
    state.lockstackStats[name] = state.lockstackStats[name] || {};

    let res = solver(
      out,
      state.rotationState[name],
      state.lockstackStats[name]
    );

    if (res) {
      Object.assign(state.args, res);
    }

    return !!res;
  };

  let crack = (name, rloc) => {
    let calls = 0;
    loc = a => {
      calls++;
      return rloc(a);
    };
    let start = Date.now();
    // step 2: fetch db state(and user upgrades/transactions?) by user/loc name
    let state = loadState(name);

    for (; ;) {
      let out = loc(state.args);
      // step 3: stop if breached or timed out
      if (isBreached(out)) {
        state.currLock = null;
        // step 7: save state to db
        storeState(name, state);
        #D(name + " " + JSON.stringify(state.args))
        #D(out);
        return { ok: true, msg: "breached - " + (Date.now() - start) + "ms && " + calls + " calls in this run" };
      }
      if (_END - Date.now() < 1500) {
        // step 7: save state to db
        storeState(name, state);
        return { ok: false, msg: "timed out" };
      }

      // step 4: detect the current lock and rotations && // step 5: attempt a solve-step of the current lock
      // start with currLock
      try {
        if (!state.currLock || !attemptLock(out, state, state.currLock)) {
          // find a new lock
          state.currLock = null;

          for (let name in locks) {
            if (attemptLock(out, state, name)) {
              state.currLock = name;
              break;
            }
          }
          if (!state.currLock) {
            storeState(name, state);
            return { ok: false, msg: ["couldn't detect current lock", out] };
          }
        }
      } catch (e) {
        if (e == "rotation") {
          #D("ROTATED");
          state.rotationState = {};
          state.args = {};
          continue;
        } else if (typeof e == "string") {
          return { ok: false, msg: "error while solving " + state.currLock + " with msg: " + e }
        } else {
          throw e;
        }
      }

    }
  };

  let l = {

    getStdErr(out) {
      let match = out.match(/`VLOCK_ERROR`\n(.*)$/);
      return match && match[1];
    },
    tryAll(rotState, name, values) {
      let atmptIdx = ++rotState[name + "Idx"] || 0;
      if (atmptIdx >= values.length) {
        throw "rotation";
      }
      rotState[name + "Idx"] = atmptIdx;

      return { [name]: values[atmptIdx] };
    },
    ez(out, rotState, name) {
      let err = l.getStdErr(out);
      if (!err || (!err.includes("`N" + name.toUpperCase()) && !err.includes("unlock command"))) {
        return false;
      }

      return l.tryAll(rotState, name, Q.ez);
    },
    c00x(out, rotState, name) {
      let err = l.getStdErr(out);
      if (!err || (!err.includes("`N" + name) && !err.includes("color name"))) {
        return false;
      }

      return l.tryAll(rotState, name, Q.colors);
    },
  };

  let locks = {
    ez_21: (out, rotState) => l.ez(out, rotState, "ez_21"),
    ez_35(out, rotState) {
      let ez = l.ez(out, rotState, "ez_35");
      if (ez) {
        return ez;
      }

      let err = l.getStdErr(out);
      if (!err || !/ (`N)?digit/.test(err)) {
        return false;
      }

      return l.tryAll(rotState, "digit", Q.digits);
    },
    ez_40(out, rotState) {
      let ez = l.ez(out, rotState, "ez_40");
      if (ez) {
        return ez;
      }

      let err = l.getStdErr(out);
      if (!err || !err.includes("prime")) {
        return false;
      }

      return l.tryAll(rotState, "ez_prime", Q.primes);
    },
    c001(out, rotState) {
      let c00x = l.c00x(out, rotState, "c001");
      if (c00x) {
        c00x.color_digit = Q.colors[rotState.c001Idx].length;
        return c00x;
      }
    },
    c002(out, rotState) {
      let c00x = l.c00x(out, rotState, "c002");
      if (c00x) {
        c00x.c002_complement = Q.colors[(rotState.c002Idx + 4) % Q.colors.length];;
        return c00x;
      }
    },
    c003(out, rotState) {
      let c00x = l.c00x(out, rotState, "c003");
      if (c00x) {
        c00x.c003_triad_1 = Q.colors[(rotState.c003Idx + 3) % Q.colors.length];
        c00x.c003_triad_2 = Q.colors[(rotState.c003Idx + 5) % Q.colors.length];
        return c00x;
      }
    },
    l0cket(out, rotState) {
      let err = l.getStdErr(out);
      if (!err || (!err.includes("`Nl0cket") && !err.includes("security k3y"))) {
        return false;
      }
      return l.tryAll(rotState, "l0cket", Q.keys);
    },
    data_check(out) {
      let err = l.getStdErr(out);
      if (err && err.includes("`NDATA_CHECK")) {
        return { DATA_CHECK: "" };
      }

      let lines = out.split("\n");
      if (!lines.length == 3 || !out.includes("++++++")) {
        return false;
      }

      let answers = "";
      for (let question of lines) {
        let answer = Q.data[question];
        if (!answer) {
          throw "unknown question: " + question;
        }
        answers += answer;
      }

      return { DATA_CHECK: answers };
    },
  };

  // step 0: verify context
  if (C.calling_script || C.is_scriptor) {
    return { ok: false, msg: "requires to be called from the cli" };
  }


  // step 1: get loc function from args
  A = A && typeof A == "object" ? _CLONE(A) : {};

  let scriptor = A.s || A.t || A.target;


  if (!scriptor || typeof scriptor.name != "string" || typeof scriptor.call != "function") {
    return { ok: false, msg: "requires a s/t/target loc scriptor" };
  }

  let name = scriptor.name;
  let loc = scriptor.call;

  // step 1.5
  if (A.resetState) {
    resetState(name);
  }

  return #D(crack(name, loc));
}
