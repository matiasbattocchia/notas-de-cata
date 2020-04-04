String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}


function modeloNota() {
  return {
    fecha: (new Date()).toISOString().split('T')[0],
    variedad: null,
    varietales: [],
    productor: null,
    línea: null,
    nombre: null,
    cosecha: null,
    color: null,
    sabores: [],
    cuerpo: null,
    taninos: null,
    acidez: null,
    alcohol: null,
    dulzura: null,
    observaciones: null,
    puntaje: null
  }
}

store = {
  usuarie: null,
  variedades: {},
  varietales: {},
  colores: {},
  sabores: {},
  estructura: {
    cuerpo:  ['liviano','medio','grueso'],
    taninos: ['bajos','medios','altos'],
    acidez:  ['baja','media','alta'],
    alcohol: ['-12%','12–14%','+14%'],
    dulzura: ['muy seco','seco','dulce']
  },
  nota_id: null,
  nota: modeloNota(),
  notas: {}
}

// AUTH
const auth = firebase.auth()
var proveedor = new firebase.auth.GoogleAuthProvider()

// DB
const db = firebase.firestore()

var notas_usuarie

auth.onAuthStateChanged(usuarie => {
  if (usuarie) {
    store.usuarie = usuarie

    notas_usuarie = `usuaries/${usuarie.uid}/notas`

    db.collection(notas_usuarie).onSnapshot(snap => {
      let aux = {}

      snap.forEach(doc => { aux[doc.id] = doc.data() })

      store.notas = aux
    })
  } else {
    store.usuarie = null
    notas_usuarie = null
  }
})

async function alcanzarColección(colección) {
  let aux = {}
  let docs = await db.collection(colección).get()

  docs.forEach(doc => { aux[doc.id] = doc.data() })

  store[colección] = aux
}

alcanzarColección('variedades')
alcanzarColección('varietales')
alcanzarColección('colores')
alcanzarColección('sabores')

var vm = new Vue({
  el: '#app',
  data: store,
  methods: {
    entrar() {
      auth.signInWithRedirect(proveedor)
    },
    salir() {
      auth.signOut()
    },
    nuevaNota() {
      this.nota_id = null
      this.nota = modeloNota()
    },
    guardarNota() {
      this.nota_id
        ? db.collection(notas_usuarie).doc(this.nota_id).set(this.nota)
        : db.collection(notas_usuarie).add(this.nota)
    },
    borrarNota() {
      if (this.nota_id) db.collection(notas_usuarie).doc(this.nota_id).delete()
    },
    mostrarNota(id) {
      this.nota_id = id
      this.nota = { ...this.notas[id] }
    }
  },
  computed: {
    coloresDeLaVariedad() {
      let variedad = this.nota.variedad

      if (!variedad) return null

      let colores = {}

      this.variedades[variedad].colores.forEach(ref => {
        colores[ref.id] = this.colores[ref.id]
      })

      return colores
    },
    varietalesDeLaVariedad() {
      let variedad = this.nota.variedad

      if (!variedad) return null

      return Object.entries(this.varietales)
        .filter(([id, varietal]) => varietal.hasOwnProperty(variedad))
        .reduce((varietales, [id, varietal]) => { varietales[id] = varietal; return varietales }, {})
    },
    saboresDelVarietal() {
      let variedad = this.nota.variedad
      let varietales = this.nota.varietales

      if (!variedad || !varietales.length) return null

      let sabores = {}

      Object.entries(this.varietalesDeLaVariedad)
        .filter(([id, varietal]) => varietales.includes(id))
        .map(([id, varietal]) => varietal[variedad]) // array de referencias a sabores
        .flat()
        .forEach(ref => {
          if (this.sabores[ref.id]) {
            sabores[ref.id] = this.sabores[ref.id]
          } else {
            alert(`Falta el sabor: ${ref.id}`)
          }
      })

      return sabores
    },
    cuerpo: {
      get() { return this.nota.cuerpo || 0 },
      set(valor) { this.nota.cuerpo = valor ? valor : null }
    },
    taninos: {
      get() { return this.nota.taninos || 0 },
      set(valor) { this.nota.taninos = valor ? valor : null }
    },
    acidez: {
      get() { return this.nota.acidez || 0 },
      set(valor) { this.nota.acidez = valor ? valor : null }
    },
    alcohol: {
      get() { return this.nota.alcohol || 0 },
      set(valor) { this.nota.alcohol = valor ? valor : null }
    },
    dulzura: {
      get() { return this.nota.dulzura || 0 },
      set(valor) { this.nota.dulzura = valor ? valor : null }
    }
  }
})

async function popularColección(colección) {
  let url = `db/${colección}.json`
  let documentos = await fetch(url).then(res => res.json())
  let batch = db.batch()

  documentos.forEach(doc => {
    batch.set(db.collection(colección).doc(doc.nombre_es), doc)
  })

  batch.commit()
}
