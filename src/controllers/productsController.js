const path = require('path');
const fs = require("fs");
let products = require('../data/products.json');
//express validator
const { validationResult } = require('express-validator');
const db = require('../database/models');
const sequelize = require("sequelize");
const { promiseImpl } = require('ejs');
const { log, Console } = require('console');

let sortear = function (productosASortear) {
    let sorteados = productosASortear.sort(() => Math.random() - 0.5)
    return sorteados;
}

const productsController = {
    //productDetail.html
    detail: (req, res) => {
        let id = req.params.id;
        db.Product.findByPk(id, {
            include: "image",
            raw: true,
            nest: true
        })
            .then(producto => {
                let productosDeCategoria;
                db.Product.findAll({
                    where: {
                        categoryID: producto.categoryID,
                        id: {
                            [sequelize.Op.not]: producto.id
                        }
                    },
                    include: "image",
                    raw: true,
                    nest: true
                })
                    .then(productos => {
                        //productosDeCategoria = productos.filter(item => item.id != producto.id);
                        let productosDesordenados = sortear(productos);
                        res.render('./products/productDetail', { elProducto: producto, productosDesordenados });
                    })
                    .catch(err => {
                        console.log(err)
                    })
            })
            .catch(err => {
                console.log(err)
            })
    },

    //Renderizar vista de todos los productos
    list: (req, res) => {
        db.Product.findAll({
            include: "image",
            raw: true,
            nest: true
        })
            .then(productos => {
                res.render('./products/productList', { products: productos });
            })
    },


    //Renderizar Vista Create
    create: (req, res) => {
        //Busco las categorías, subcategorias y géneros
        let promesaCategorias = db.Category.findAll();
        let promesaSubcategorias = db.Subcategory.findAll();
        let promesaGeneros = db.Genre.findAll();

        Promise.all([promesaCategorias, promesaSubcategorias, promesaGeneros])
            .then(function ([resultadoCategorias, resultadoSubcategorias, resultadoGeneros]) {
                //Mando las categorias, subcategorias y géneros a la vista
                res.render('./products/productCreate', {
                    categorias: resultadoCategorias,
                    subcategorias: resultadoSubcategorias,
                    generos: resultadoGeneros
                });
            })
            .catch(error => {
                console.log(error);
            })
    },

    //Guardar producto nuevo
    store: (req, res) => {

        const validationsResult = validationResult(req);

        //si hay errores se renderiza de nuevo el formulario de creación
        if (validationsResult.errors.length > 0) {
            if (req.file.filename) {
                fs.unlinkSync(path.join(__dirname, "../../public/img/productos", req.file.filename));
            }
            //Busca todas las categorías, subcategorías y géneros
            let promesaCategorias = db.Category.findAll();
            let promesaSubcategorias = db.Subcategory.findAll();
            let promesaGeneros = db.Genre.findAll();

            Promise.all([promesaCategorias, promesaSubcategorias, promesaGeneros])
                .then(function ([resultadoCategorias, resultadoSubcategorias, resultadoGeneros]) {
                    //Mando las categorias, subcategorias, géneros, errores y datos previamente cargados a la vista
                    res.render('./products/productCreate', {
                        categorias: resultadoCategorias,
                        subcategorias: resultadoSubcategorias,
                        generos: resultadoGeneros,
                        errors: validationsResult.mapped(),
                        oldData: req.body
                    });
                })
        }
        //Si no hay errores, se procede con la carga del producto
        else {
            //Toma los datos del req y del req.body

            //Guarda el atributo file del request, donde se encuentra la imagen cargada
            let file = req.file;

            //Valores de esDestacado, esNovedad, esMagicPass
            let esDestacado, esNovedad, esMagicPass;
            esDestacado = req.body.esDestacado ? true : false;
            esNovedad = req.body.esNovedad ? true : false;
            esMagicPass = req.body.esMagicPass ? true : false;

            //Array de Géneros donde se guardan los géneros cargados para el producto, si no se cargan géneros se asigna el género "Inclasificable"
            let generos = [];
            if (req.body.esMedieval) {
                let id = parseInt(req.body.esMedieval);
                generos.push(id);
            }
            if (req.body.esUrbana) {
                let id = parseInt(req.body.esUrbana);
                generos.push(id);
            }
            if (req.body.esClasica) {
                let id = parseInt(req.body.esClasica);
                generos.push(id);
            }
            if (req.body.esOscura) {
                let id = parseInt(req.body.esOscura);
                generos.push(id);
            }
            if (req.body.esJuvenil) {
                let id = parseInt(req.body.esJuvenil);
                generos.push(id);
            }
            if (generos.length == 0) {
                generos.push(6);
            }

            //Crea el producto
            db.Product.create({
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                precio: req.body.precio,
                descuento: req.body.descuento,
                esNovedad: esNovedad,
                esDestacado: esDestacado,
                esMagicPass: esMagicPass,
                categoryID: req.body.categoria,
                subcategoryID: req.body.subcategoria,
            })
                .then(producto => {
                    //Crea una imagen asociada al producto recién creado
                    db.Image.create({
                        url: `/img/productos/${file.filename}`,
                        productID: producto.id
                    });

                    //Crea las asociaciones entre el producto y sus géneros
                    producto.setGenre(generos);

                    //Busca los atributos pertenecientes a la subcategoría del producto creado
                    db.Attribute.findAll({
                        where: {
                            subcategoryID: producto.subcategoryID
                        }
                    })
                        .then(atributos => {
                            //Según el id de la categoría del producto, carga los valores a los atributos correspondientes
                            switch (producto.subcategoryID) {
                                case '1':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.cantidadJugadorxs } });
                                    producto.addAttribute(atributos[1], { through: { valor: req.body.edadRecomendada } });
                                    break;
                                case '2':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.desarrolladorx } });
                                    producto.addAttribute(atributos[1], { through: { valor: req.body.lanzamiento } });
                                    break;
                                case '3':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.extension } });
                                    producto.addAttribute(atributos[1], { through: { valor: req.body.autoriaLibro } });
                                    break;
                                case '4':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.duracionAudiolibro } });
                                    producto.addAttribute(atributos[1], { through: { valor: req.body.autoriaAudiolibro } });
                                    producto.addAttribute(atributos[2], { through: { valor: req.body.narradorx } });
                                    break;
                                case '5':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.talle } });
                                    break;
                                case '6': break
                                case '7': break
                                case '8':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.duracionPelicula } });
                                    break;
                                case '9':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.duracionSoundtrack } });
                                    break;
                            }
                        })
                })

            //Redirecciona a Home
            res.redirect("/");
        }
    },

    //Renderizamos la vista de Edit
    edit: (req, res) => {
        let id = req.params.id;

        //Busco las categorías, subcategorias, géneros, el producto seleccionado y sus atributos.
        let promesaCategorias = db.Category.findAll();
        let promesaSubcategorias = db.Subcategory.findAll();
        let promesaGeneros = db.Genre.findAll();
        let promesaProducto = db.Product.findByPk(id, {
            include: ["attribute", "genre", "image"],
            nest: true
        })

        Promise.all([promesaCategorias, promesaSubcategorias, promesaGeneros, promesaProducto])
            .then(function ([resultadoCategorias, resultadoSubcategorias, resultadoGeneros, resultadoProducto]) {
                //Mando las categorias, subcategorias, géneros y producto a la vista
                if (resultadoProducto) {
                    res.render('./products/productEdit', { categorias: resultadoCategorias, subcategorias: resultadoSubcategorias, generos: resultadoGeneros, product: resultadoProducto });
                } else {
                    res.send("Producto no encontrado");
                }
            })
            .catch(error => {
                console.log(error);
            })
    },
    update: (req, res) => {
        let id = req.params.id;
        let file = req.file;
        const validationsResult = validationResult(req);

        //si hay errores se renderiza de nuevo el formulario de creación
        if (validationsResult.errors.length > 0) {
            if (req.file && req.file.filename) {
                fs.unlinkSync(path.join(__dirname, "../../public/img/productos", req.file.filename));
            }
            //Busco las categorías, subcategorias, géneros, el producto seleccionado y sus atributos.
            let promesaCategorias = db.Category.findAll();
            let promesaSubcategorias = db.Subcategory.findAll();
            let promesaGeneros = db.Genre.findAll();
            let promesaProducto = db.Product.findByPk(id, {
                include: ["attribute", "genre", "image"],
                nest: true
            })

            Promise.all([promesaCategorias, promesaSubcategorias, promesaGeneros, promesaProducto])
                .then(function ([resultadoCategorias, resultadoSubcategorias, resultadoGeneros, resultadoProducto]) {
                    //Mando las categorias, subcategorias, géneros y producto a la vista
                    res.render('./products/productEdit', {
                        categorias: resultadoCategorias,
                        subcategorias: resultadoSubcategorias,
                        generos: resultadoGeneros,
                        product: resultadoProducto,
                        errors: validationsResult.mapped(),
                    });
                })
                .catch(error => {
                    console.log(error);
                })
        } else {

            //Toma los datos del req y del req.body
            //Valores de esDestacado, esNovedad, esMagicPass
            let esDestacado, esNovedad, esMagicPass;
            esDestacado = req.body.esDestacado ? true : false;
            esNovedad = req.body.esNovedad ? true : false;
            esMagicPass = req.body.esMagicPass ? true : false;

            //Array de Géneros donde se guardan los géneros cargados para el producto, si no se cargan géneros se asigna el género "Inclasificable"
            let generos = [];
            if (req.body.esMedieval) {
                let id = parseInt(req.body.esMedieval);
                generos.push(id);
            }
            if (req.body.esUrbana) {
                let id = parseInt(req.body.esUrbana);
                generos.push(id);
            }
            if (req.body.esClasica) {
                let id = parseInt(req.body.esClasica);
                generos.push(id);
            }
            if (req.body.esOscura) {
                let id = parseInt(req.body.esOscura);
                generos.push(id);
            }
            if (req.body.esJuvenil) {
                let id = parseInt(req.body.esJuvenil);
                generos.push(id);
            }
            if (generos.length == 0) {
                generos.push(6);
            }

            let { nombre, descripcion, precio, categoria, subcategoria, descuento } = req.body;

            db.Product.findByPk(id)
                .then(producto => {
                    producto.nombre = nombre;
                    producto.descripcion = descripcion;
                    producto.precio = precio;
                    producto.descuento = descuento;
                    producto.esNovedad = esNovedad;
                    producto.esDestacado = esDestacado;
                    producto.esMagicPass = esMagicPass;
                    producto.categoryID = categoria;
                    producto.subcategoryID = subcategoria;
                    producto.save()
                        .then(resultado => {

                            //Actualiza la imagen si se trajo una imagen de la vista
                            if (file) {
                                db.Image.update({
                                    url: `/img/productos/${file.filename}`,
                                }, {
                                    where: {
                                        productID: id
                                    }
                                })
                                    .catch(error => console.log(error))
                            }

                            //Crea las asociaciones entre el producto y sus géneros
                            producto.setGenre(generos);

                            //Busca los atributos pertenecientes a la subcategoría del producto
                            db.Attribute.findAll({
                                where: {
                                    subcategoryID: producto.subcategoryID
                                }
                            })
                                .then(atributos => {
                                    //Según el id de la categoría del producto, carga los valores a los atributos correspondientes
                                    switch (producto.subcategoryID) {
                                        case '1':
                                            producto.setAttribute(atributos[0], { through: { valor: req.body.cantidadJugadorxs } });
                                            producto.setAttribute(atributos[1], { through: { valor: req.body.edadRecomendada } });
                                            break;
                                        case '2':
                                            producto.setAttribute(atributos[0], { through: { valor: req.body.desarrolladorx } });
                                            producto.setAttribute(atributos[1], { through: { valor: req.body.lanzamiento } });
                                            break;
                                        case '3':
                                            producto.setAttribute(atributos[0], { through: { valor: req.body.extension } });
                                            producto.setAttribute(atributos[1], { through: { valor: req.body.autoriaLibro } });
                                            break;
                                        case '4':
                                            producto.setAttribute(atributos[0], { through: { valor: req.body.duracionAudiolibro } });
                                            producto.setAttribute(atributos[1], { through: { valor: req.body.autoriaAudiolibro } });
                                            producto.setAttribute(atributos[2], { through: { valor: req.body.narradorx } });
                                            break;
                                        case '5':
                                            producto.setAttribute(atributos[0], { through: { valor: req.body.talle } });
                                            break;
                                        case '6': break
                                        case '7': break
                                        case '8':
                                            producto.setAttribute(atributos[0], { through: { valor: req.body.duracionPelicula } });
                                            break;
                                        case '9':
                                            producto.setAttribute(atributos[0], { through: { valor: req.body.duracionSoundtrack } });
                                            break;
                                    }
                                })
                        })
                    res.redirect("/product/list");
                })
        }
    },
    delete: (req, res) => {
        //Guardo el id del producto a borrar que viene de la request
        let id = req.params.id;

        //Busco el producto a borrar para conseguir el URL de su imagen
        db.Product.findByPk(id, {
            include: ["image"],
            raw: true,
            nest: true
        })
            .then(producto => {
                //guardo la URL de la imagen
                let imageURL = producto.image.url;
                //Borro la imagen asociada al producto
                db.Image.destroy({ where: { productID: id } })
                    .then(res1 => {
                        //Borro el archivo de la imagen
                        fs.unlinkSync(path.join(__dirname, "../../public", imageURL));

                        //Borro los géneros asociados al producto
                        db.ProductGenre.destroy({ where: { productID: id } })
                            .then(res2 => {
                                //Borro los atributos del producto
                                db.AttributeProduct.destroy({ where: { productID: id } })
                                    .then(res3 => {
                                        //Borro el producto de cada carrito donde se encuentra
                                        db.CartProduct.destroy({ where: { productID: id } })
                                            .then(res4 => {
                                                //Borro el producto
                                                db.Product.destroy({ where: { id: id } })
                                                    .then(respuesta => {
                                                        res.redirect("/product/list");
                                                    })
                                                    .catch(error => console.log(error))
                                            })
                                            .catch(error => console.log(error))
                                    })
                                    .catch(error => console.log(error))
                            })
                            .catch(error => console.log(error))
                    })
                    .catch(error => console.log(error))
            })
            .catch(error => console.log(error))
    },
    //productCart.html
    cart: (req, res) => {
        res.render('./products/productCart', { products });
    },
    //Boton que agrega el producto a la tabla de la DB
    cartButton: (req, res) => {
        db.CartProduct.create({

            productID: req.params.id,
            usersID: users.id

        })

        res.render('./products/productCart', { products });
    },
    //Lista todos los productos del carrito
    cartList: (req, res) => {
        db.CartProduct.findAll()
            .then(function (CartProduct) {
                res.render('/cart', { CartProduct: CartProduct })
            })
    },
    //Borra productos del carrito
    cartDelete: (req, res) => {
        db.CartProduct.destroy({
            where: {
                id: req.params.id
            }
        }),

            res.redirect('/cart')
    }
};
module.exports = productsController;