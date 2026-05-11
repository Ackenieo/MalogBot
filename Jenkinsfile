pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }

    environment {
        PROJECT_NAME = 'malogbot'
        COMPOSE_FILE = 'docker-compose.yml'
        COMPOSE_PROJECT_NAME = 'malogbot'
        APP_PORT = '5000'
        HEALTH_CHECK_URL = "http://localhost:${APP_PORT}/"
        HEALTH_CHECK_RETRIES = 10
        HEALTH_CHECK_INTERVAL = 5
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                echo '拉取最新代码...'
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/dev']], 
                    userRemoteConfigs: [[
                        credentialsId: '3170ba34-9602-4b4e-a47b-fdb19e85c072',
                        url: 'git@github.com:Ackenieo/MalogBot.git'
                    ]]
                ])
            }
        }

        stage('Setup') {
            steps {
                echo '检查环境依赖...'
                sh 'docker --version'
                sh 'docker compose version'
                sh 'node --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '安装前端依赖（使用缓存）...'
                dir('frontend') {
                    sh '''
                        if [ -d "node_modules" ]; then
                            echo "使用已有 node_modules，仅更新变更..."
                            npm install --prefer-offline
                        else
                            echo "首次安装依赖..."
                            npm ci --prefer-offline
                        fi
                    '''
                }
            }
        }

        stage('Build Frontend') {
            steps {
                echo '构建前端...'
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Build & Deploy') {
            steps {
                echo '停止旧容器...'
                sh "docker compose -f ${COMPOSE_FILE} -p ${COMPOSE_PROJECT_NAME} down --remove-orphans || true"
                echo '构建并部署 Docker 服务...'
                sh "docker compose -f ${COMPOSE_FILE} -p ${COMPOSE_PROJECT_NAME} up -d --build --remove-orphans"
            }
        }

        stage('Health Check') {
            steps {
                echo '等待服务启动...'
                sh "sleep ${HEALTH_CHECK_INTERVAL}"
                echo '执行健康检查...'
                script {
                    def retries = env.HEALTH_CHECK_RETRIES as Integer
                    def healthy = false
                    for (int i = 0; i < retries; i++) {
                        try {
                            sh "curl -f ${HEALTH_CHECK_URL} > /dev/null 2>&1"
                            healthy = true
                            echo "服务健康检查通过!"
                            break
                        } catch (Exception e) {
                            echo "健康检查失败，重试 ${i + 1}/${retries}..."
                            sh "sleep ${HEALTH_CHECK_INTERVAL}"
                        }
                    }
                    if (!healthy) {
                        error "服务健康检查失败，超过 ${retries} 次重试"
                    }
                }
            }
        }

        stage('Verify') {
            steps {
                echo '验证部署状态...'
                sh "docker compose -f ${COMPOSE_FILE} -p ${COMPOSE_PROJECT_NAME} ps"
            }
        }

        stage('Cleanup') {
            steps {
                echo '清理悬空镜像...'
                sh 'docker image prune -f'
            }
        }
    }

    post {
        success {
            echo '=========================================='
            echo "部署成功！ =ᗜωᗜ= ${PROJECT_NAME} 已更新"
            echo "访问地址: ${HEALTH_CHECK_URL}"
            echo '=========================================='
        }
        failure {
            echo '=========================================='
            echo '部署失败! (｡í_ì｡) 请检查日志'
            echo '=========================================='
            sh "docker compose -f ${COMPOSE_FILE} -p ${COMPOSE_PROJECT_NAME} logs --tail=50"
        }
    }
}
