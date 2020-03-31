String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function modeloNota() {
  return {
    fecha: (new Date()).toISOString().split('T')[0],
    variedad: null,
    varietal: null,
    productor: null,
    línea: null,
    nombre: null,
    cosecha: null,
    color: null,
    sabores: {},
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
  variedades: {},
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

const db = firebase.firestore()

async function alcanzarColección(colección, subcolección) {
  let aux = {}
  let docs = await db.collection(colección).get()

  docs.forEach(doc => { aux[doc.id] = doc.data() })

  path = colección.split('/')

  if (path.length === 1) {
    store[path[0]] = aux
  } else {
    store[path[0]][path[1]][path[2]] = aux
  }

  if (subcolección) {
    docs.forEach(doc => alcanzarColección(`${colección}/${doc.id}/${subcolección}`) )
  }
}

alcanzarColección('variedades', 'varietales')
alcanzarColección('colores')
alcanzarColección('sabores')

db.collection('notas').onSnapshot(snap => {
  let aux = {}

  snap.forEach(doc => { aux[doc.id] = doc.data() })

  store.notas = aux
})

var vm = new Vue({
  el: '#app',
  data: store,
  methods: {
    nuevaNota() {
      this.nota_id = null
      this.nota = modeloNota()
    },
    guardarNota() {
      let sabores = this.nota.sabores

      for (const [key, value] of Object.entries(sabores)) if (!value) delete sabores[key]

      this.nota_id
        ? db.collection('notas').doc(this.nota_id).set(this.nota)
        : db.collection('notas').add(this.nota)
    },
    borrarNota() {
      if (this.nota_id) db.collection('notas').doc(this.nota_id).delete()
    },
    presentarVino({ productor, línea, nombre, cosecha }) {
      return [productor, línea, nombre, cosecha]
        .filter(Boolean)
        .join(' ')
    },
    mostrarNota(id) {
      this.nota_id = id
      this.nota = this.notas[id]
    }
  },
  computed: {
    coloresDeLaVariedad() {
      let variedad = this.nota.variedad
      let varietal = this.nota.varietal

      if (!variedad) return null

      if (!this.variedades[variedad].varietales[varietal]) this.nota.varietal = null

      let colores = {}

      this.variedades[variedad].colores.forEach(({ id }) => {
        colores[id] = this.colores[id]
      })

      return colores
    },
    varietalesDeLaVariedad() {
      let variedad = this.nota.variedad

      if (!variedad) return null

      return this.variedades[variedad].varietales
    },
    saboresDelVarietal() {
      let variedad = this.nota.variedad
      let varietal = this.nota.varietal

      if (!variedad || !varietal) return null

      let sabores = {}

      this.variedades[variedad].varietales[varietal].sabores.forEach(({ id }) => {
        if (this.sabores[id]) {
          sabores[id] = this.sabores[id]
        } else {
          alert(`Falta el sabor: ${id}`)
        }
      })

      return sabores
    },
    varietal: {
      get() { return this.nota.varietal || '' },
      set(valor) { this.nota.varietal = valor ? valor : null }
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
