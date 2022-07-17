const express = require('express');
const routes = express.Router();
const userController = require('../controllers/usersController');
const path = require('path');
 feature/profile
//middleware para visitantes - que impide que usuarixs logueadxs entren a login y registro 
const guestMiddleware = require('../middleWares/guestMiddelware');
//middleware para usuarixs logeadxs - que impide que usuarixs NO logueadxs entren a perfil y carrito 
// ! FALTA IMPLEMENTAR EN LA RUTA DE PERFIL  cuando esté lista  
const loggedMiddleware = require('../middleWares/loggedMiddleware');

upload = require('../middleWares/multerUsers');

const { body } = require('express-validator');
const { Router } = require('express');


const validations = [
    body('nombre').notEmpty().withMessage('Por favor completá con tu nombre'),
    body('apellido').notEmpty().withMessage('Es necesario que completes tu apellido'),
    body('email')
        .notEmpty().withMessage('Por favor completá tu correo').bail()
        .isEmail().withMessage('¡El formato del correo no es válido! Intentalo de nuevo'),
    body('password').notEmpty().withMessage('No olvides tu contraseña'),
    body('passwordRepetir')
        .notEmpty().withMessage('Por favor repetí la contraseña.').bail()
        .custom((value, { req }) => {
            let passOriginal = req.body.password;
            let nuevaPass = req.body.passwordRepetir;

            if (passOriginal != nuevaPass) {
                throw new Error('Las contraseñas no coinciden.');
            }
            return true;
        }),
        body('profilePicture').custom((value, {req})=>{
            let file = req.file;
            let extensionesPermitidas = ['.png',  '.jpg', '.jpeg', '.gif', '.svg', '.jfif'];
            let fileExtension = path.extname(file.originalname);
            if(!file){
                throw new Error('Seleccioná una imagen para tu producto');
            }else{   
                if(!extensionesPermitidas.includes(fileExtension.toLowerCase())){
                    throw new Error (`Las extensiones de archivo permitidas son ${extensionesPermitidas.join(", ")}`)
                }
            }
                return true;
            })
];
develop

const upload = require('../middleWares/multerUsers');
// validacion de productos 
const validations = require('../middleWares/usersValidations');

//rutas de páginas de usuarios
//login
routes.get("/login", guestMiddleware, userController.login);
routes.post("/login",  validations.validationsLogin, userController.processLogin);
//registro
routes.get("/signup", guestMiddleware, userController.signup);
routes.post("/signup", upload.single('profilePicture'), validations.validationsSignup, userController.store);
//edicion
routes.get("/:id/edit", userController.edit);
routes.put("/:id/edit", upload.single('profilePicture'), userController.update);
//borrado
routes.delete("/:id/delete", userController.delete);
feature/profile
//profile
routes.get("/profile", loggedMiddleware.noLogged, userController.profile);

//perfil de usuario
routes.get("/perfil",userController.perfil)
develop

module.exports = routes;