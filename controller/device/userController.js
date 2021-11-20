const User = require('../../model/user');
const userSchemaKey = require('../../utils/validation/userValidation');
const validation = require('../../utils/validateRequest');
const dbService = require('../../utils/dbService');
const auth = require('../../services/auth');
const deleteDependentService = require('../../utils/deleteDependent');
    
const addUser = async (req, res) => {
  try {
    let validateRequest = validation.validateParamsWithJoi(
      req.body,
      userSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.inValidParam({ message : `Invalid values in parameters, ${validateRequest.message}` });
    } 
    let data = new User({
      ...req.body
      ,addedBy:req.user.id
    });
    let result = await dbService.createDocument(User,data);
    return  res.ok({ data : result });
  } catch (error) {
    if (error.name === 'ValidationError'){
      return res.validationError({ message : `Invalid Data, Validation Failed at ${ error.message}` });
    }
    if (error.code && error.code == 11000){
      return res.isDuplicate();
    }
    return res.failureResponse(); 
  }
};
    
const findAllUser = async (req,res) => {
  try {
    let options = {};
    let query = {};
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.user && req.user.id) {
      query._id = { $ne: req.user.id };
      if (req.body && req.body.query && req.body.query._id) {
        query._id.$in = [req.body.query._id];
      }
    } else {
      return res.badRequest();
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.countDocument(User, query);
      return res.ok({ data: { totalRecords } });
    }
        
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let result = await dbService.getAllDocuments( User,query,options);
    if (result && result.data && result.data.length){
      return res.ok({ data :result });   
    }
    return res.recordNotFound();
  } catch (error){
    return res.failureResponse();
  }
};
    
const getUserCount = async (req,res) => {
  try {
    let where = {};
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let result = await dbService.countDocument(User,where);
    return res.ok({ data : result });
  } catch (error){
    return res.failureResponse();
  }
};

const getUserByAggregate = async (req,res)=>{
  try {
    let result = await dbService.getDocumentByAggregation(User,req.body);
    if (result){
      return res.ok({ data :result });
    }
    return res.recordNotFound();
  } catch (error){
    return res.failureResponse(error.message);
  }
};

const softDeleteManyUser = async (req,res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    let query = {};
    if (req.user){
      query = {
        '_id': {
          '$in': ids,
          '$ne': req.user.id
        }
      };
    } 
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id
    };
    let result = await deleteDependentService.softDeleteUser(query, updateBody);
    if (!result) {
      return res.recordNotFound();
    }
    return  res.ok({ data:result });
  } catch (error){
    return res.failureResponse(); 
  }
};

const bulkInsertUser = async (req,res)=>{
  try {
    if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
      return res.badRequest();
    }
    let data = { ...req.body.data }; 

    for (let i = 0;i < data.length;i++){
      data[i] = {
        ...{ addedBy:req.user.id },
        ...data[i]
      };
    }
    let result = await dbService.bulkInsert(User,data);
    return  res.ok({ data :result });
  } catch (error){
    if (error.name === 'ValidationError'){
      return res.validationError({ message : `Invalid Data, Validation Failed at ${ error.message}` });
    }
    else if (error.code && error.code == 11000){
      return res.isDuplicate();
    }
    return res.failureResponse();
  }
};

const bulkUpdateUser = async (req,res)=>{
  try {
    let filter = {};
    let data;
    if (req.body && typeof req.body.filter === 'object' && req.body.filter !== null) {
      filter = { ...req.body.filter };
    }
    if ( typeof req.body.data === 'object' && req.body.data !== null) {
      data = { ...req.body.data, };
      delete data['addedBy'];
      delete data['updatedBy'];
      data.updatedBy = req.user.id;
      let result = await dbService.bulkUpdate(User,filter,data);
      if (!result){
        return res.recordNotFound();
      }
      return  res.ok({ data :result });
    } else {
      return res.badRequest();
    }
  } catch (error){
    return res.failureResponse(); 
  }
};
const deleteManyUser = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    let query = {};
    if (req.user){
      query = {
        '_id': {
          '$in': ids,
          '$ne': req.user.id
        }
      };
    } 
    else {
      return res.badRequest();
    } 
    if (req.body.isWarning) {
      let result = await deleteDependentService.countUser(query);
      return res.ok({ data :result }); 
    }
    else {
      let result = await deleteDependentService.deleteUser(query);
      return res.ok({ data :result });
    }
  } catch (error){
    return res.failureResponse(); 
  }
};

const softDeleteUser = async (req,res) => {
  try {
    let query = {};
    if (req.user){
      query = {
        '_id': {
          '$eq': req.params.id,
          '$ne': req.user.id
        }
      };
    } 
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id
    };
    let result = await deleteDependentService.softDeleteUser(query, updateBody);
    if (!result){
      return res.recordNotFound();
    }
    return  res.ok({ data:result });
  } catch (error){
    return res.failureResponse(); 
  }
};
    
const partialUpdateUser = async (req,res) => {
  try {
    delete req.body['addedBy'];
    delete req.body['updatedBy'];
    let data = { ...req.body };
    let validateRequest = validation.validateParamsWithJoi(
      data,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.inValidParam({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    let query = {};
    if (req.user){
      query = {
        '_id': {
          '$eq': req.params.id,
          '$ne': req.user.id
        }
      };
    } else {
      return res.badRequest();
    } 
    let result = await dbService.findOneAndUpdateDocument(User, query, data,{ new:true });
    if (!result) {
      return res.recordNotFound();
    }
    return res.ok({ data:result });
  } catch (error){
    return res.failureResponse();
  }
};
    
const updateUser = async (req,res) => {
  try {
    delete req.body['addedBy'];
    delete req.body['updatedBy'];
    let data = {
      updatedBy:req.user.id,
      ...req.body,
    };
    let validateRequest = validation.validateParamsWithJoi(
      data,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.inValidParam({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    let query = {};
    if (req.user){
      query = {
        '_id': {
          '$eq': req.params.id,
          '$ne': req.user.id
        }
      };
    } else {
      return res.badRequest();
    }
    let result = await dbService.findOneAndUpdateDocument(User,query,data,{ new:true });
    if (!result){
      return res.recordNotFound();
    }
    return  res.ok({ data:result });
  } catch (error){
    if (error.name === 'ValidationError'){
      return res.validationError({ message : `Invalid Data, Validation Failed at ${ error.message}` });
    }
    else if (error.code && error.code == 11000){
      return res.isDuplicate();
    }
    return res.failureResponse();
  }
};
const getUser = async (req,res) => {
  try {
    let query = {};
    query._id = req.params.id;
    let options = {};
    if (req.body && req.body.populate && req.body.populate.length) options.populate = req.body.populate;
    if (req.body && req.body.select && req.body.select.length) options.select = req.body.select;
    let result = await dbService.getSingleDocument(User,query, options);
    if (result){
            
      return  res.ok({ data :result });
    }
    return res.recordNotFound();
  }
  catch (error){
    return res.failureResponse();
  }
};
const deleteUser = async (req,res) => {
  try {
    if (req.params.id){
      let query = {};
      if (req.user){
        query = {
          '_id': {
            '$eq': req.params.id,
            '$ne': req.user.id
          }
        };
      } 
      else {
        return res.badRequest();
      } 
      if (req.body.isWarning) {
        let result = await deleteDependentService.countUser(query);
        return res.ok({ data :result });
         
      } else {
        let result = await deleteDependentService.deleteUser(query);
        if (!result){
          return res.recordNotFound();
        }
        return  res.ok({ data :result });    
      }
    } else {
      return res.badRequest();
    }
  }
  catch (error){
    return res.failureResponse(); 
  }
};

const changePassword = async (req, res) => {
  try {
    let params = req.body;
    if (!params.newPassword || !req.user.id || !params.oldPassword) {
      return res.inValidParam({ message : 'Please Provide userId and new Password and Old password' });
    }
    let result = await auth.changePassword({
      ...params,
      userId:req.user.id
    });
    if (result.flag){
      return res.invalidRequest({ message :result.data });
    }
    return res.requestValidated({ message : result.data });
  } catch (error) {
    return res.failureResponse();
  }
};

const updateProfile = async (req, res) => {
  try {
    let data = { ...req.body };
    let validateRequest = validation.validateParamsWithJoi(
      data,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.inValidParam({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    delete data.password;
    delete data.createdAt;
    delete data.updatedAt;
    if (data.id) delete data.id;
    let result = await dbService.findOneAndUpdateDocument(User,{ _id:req.user.id },data,{ new:true });
    if (!result){
      return res.failureResponse();
    }            
    return  res.ok({ data :result });
  } catch (error){
    if (error.name === 'ValidationError'){
      return res.isDuplicate();
    }
    if (error.code && error.code == 11000){
      return res.isDuplicate();
    }
    return res.failureResponse();
  }
};
module.exports = {
  addUser,
  findAllUser,
  getUserCount,
  getUserByAggregate,
  softDeleteManyUser,
  bulkInsertUser,
  bulkUpdateUser,
  deleteManyUser,
  softDeleteUser,
  partialUpdateUser,
  updateUser,
  getUser,
  deleteUser,
  changePassword,
  updateProfile,
};